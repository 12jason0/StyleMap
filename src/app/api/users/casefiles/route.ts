import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/users/casefiles
// Returns the current user's completed escape case files
export async function GET(request: NextRequest) {
	try {
		const userIdStr = resolveUserId(request);
		if (!userIdStr) return NextResponse.json({ items: [] }, { status: 200 });
		const userId = Number(userIdStr);
		if (!Number.isFinite(userId) || userId <= 0) return NextResponse.json({ items: [] }, { status: 200 });

		// Completed escapes with story info
		const completed = await prisma.completedEscape.findMany({
			where: { userId },
			orderBy: { completedAt: "desc" },
			select: {
				storyId: true,
				completedAt: true,
				story: {
					select: {
						id: true,
						title: true,
						synopsis: true,
						region: true,
						imageUrl: true,
						reward_badge: { select: { id: true, name: true, image_url: true } },
					},
				},
			},
		});

		if (completed.length === 0) {
			return NextResponse.json({ items: [] }, { status: 200 });
		}

		// Optional: collage count per story for the user
		const storyIds = Array.from(new Set(completed.map((c) => c.storyId))).filter((v) => Number.isFinite(v));
		const collages = await prisma.userCollage.findMany({
			where: { userId, storyId: { in: storyIds as number[] } },
			select: { storyId: true, id: true },
		});
		const collageCountByStoryId = collages.reduce<Record<number, number>>((acc, row) => {
			if (typeof row.storyId === "number") acc[row.storyId] = (acc[row.storyId] || 0) + 1;
			return acc;
		}, {});

		const items = completed.map((c) => ({
			story_id: c.storyId,
			title: c.story?.title ?? "",
			synopsis: c.story?.synopsis ?? "",
			region: c.story?.region ?? null,
			imageUrl: c.story?.imageUrl ?? null,
			completedAt: c.completedAt?.toISOString?.() ?? null,
			badge: c.story?.reward_badge
				? {
						id: c.story.reward_badge.id,
						name: c.story.reward_badge.name,
						image_url: c.story.reward_badge.image_url ?? null,
				  }
				: null,
			photoCount: collageCountByStoryId[c.storyId] || 0,
		}));

		return NextResponse.json({ items });
	} catch (e: any) {
		console.error("[/api/users/casefiles] GET error:", e);
		return NextResponse.json({ items: [] }, { status: 200 });
	}
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import { getJwtSecret, getUserIdFromRequest, resolveUserId as resolveUserIdFromAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const resolveUserId = resolveUserIdFromAuth;

export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json([], { status: 200 });

        // 완료된 스토리 진행 내역 조회 (userStoryProgress 기반)
        const rows = await prisma.userStoryProgress.findMany({
            where: { user_id: userId, status: "completed" },
            orderBy: { completed_at: "desc" },
            include: {
                story: { include: { reward_badge: true } },
            },
        });

        // 하위 호환 및 다른 완료 경로: CompletedEscape 기반 완료 내역도 함께 조회
        let completedEscapes: any[] = [];
        try {
            completedEscapes = await (prisma as any).completedEscape.findMany({
                where: { userId },
                orderBy: { completedAt: "desc" },
                include: { story: { include: { reward_badge: true } } },
            });
        } catch {}

        // 스토리별 사진 업로드 수 카운트 (두 소스의 storyId를 모두 포함)
        const storyIds = Array.from(
            new Set([
                ...rows.map((r) => r.story_id),
                ...completedEscapes.map((r: any) => Number(r.storyId)).filter((n: number) => Number.isFinite(n)),
            ])
        );
        // 1) storyIds에 속하는 장소(챕터) id 목록을 먼저 구함
        //    스키마에 따라 storyChapter/PlaceOption 중 실제 사용하는 테이블을 선택하세요.
        const chaptersForStories: Array<{ id: number; storyId: number }> = await (async () => {
            try {
                // 우선 placeOption 사용 시도
                return await (prisma as any).placeOption.findMany({
                    where: { storyId: { in: storyIds } },
                    select: { id: true, storyId: true },
                });
            } catch {
                // placeOption이 없으면 storyChapter 사용
                const list = await (prisma as any).storyChapter.findMany({
                    where: { story_id: { in: storyIds } },
                    select: { id: true, story_id: true },
                });
                return (list as Array<{ id: number; story_id: number }>).map((c) => ({
                    id: c.id,
                    storyId: c.story_id,
                }));
            }
        })();

        const chapterIds = chaptersForStories.map((c) => c.id);

        // 2) 그 chapterId들에 대해 groupBy 실행 (관계 경로 필터링 제거)
        const submissions = chapterIds.length
            ? await prisma.missionSubmission.groupBy({
                  by: ["chapterId"],
                  where: { userId, photoUrl: { not: null }, chapterId: { in: chapterIds } },
                  _count: { _all: true },
              })
            : [];
        const chapterIdToCount = new Map<number, number>();
        for (const s of submissions) {
            chapterIdToCount.set(
                s.chapterId as number,
                (chapterIdToCount.get(s.chapterId as number) || 0) + (s as any)._count?._all || 0
            );
        }

        // 챕터 → 스토리 집계는 간단히 스토리 기준으로 카운트 합산
        const photoCountByStory: Record<number, number> = {};
        if (storyIds.length > 0) {
            // storyId ↔ chapterId 매핑 재사용
            for (const ch of chaptersForStories) {
                const c = chapterIdToCount.get(ch.id) || 0;
                if (!photoCountByStory[ch.storyId]) photoCountByStory[ch.storyId] = 0;
                photoCountByStory[ch.storyId] += c;
            }
        }

        const result = rows
            .filter((r) => !!r.story)
            .map((r) => {
                const s = r.story as any;
                const badge = s?.reward_badge;
                return {
                    story_id: s.id,
                    title: s.title as string,
                    synopsis: (s.synopsis as string) || "",
                    region: (s.region as string) || null,
                    imageUrl: (s.imageUrl as string) || (badge?.image_url as string) || null,
                    completedAt: r.completed_at || null,
                    badge: badge
                        ? {
                              id: badge.id as number,
                              name: badge.name as string,
                              image_url: (badge.image_url as string) || null,
                          }
                        : null,
                    photoCount: photoCountByStory[s.id] || 0,
                };
            });

        // CompletedEscape에서 온 완료 내역도 동일 포맷으로 매핑
        const resultFromCompleted = completedEscapes
            .filter((r: any) => !!r.story)
            .map((r: any) => {
                const s = r.story as any;
                const badge = s?.reward_badge;
                return {
                    story_id: s.id,
                    title: s.title as string,
                    synopsis: (s.synopsis as string) || "",
                    region: (s.region as string) || null,
                    imageUrl: (s.imageUrl as string) || (badge?.image_url as string) || null,
                    completedAt: r.completedAt || null,
                    badge: badge
                        ? {
                              id: badge.id as number,
                              name: badge.name as string,
                              image_url: (badge.image_url as string) || null,
                          }
                        : null,
                    photoCount: photoCountByStory[s.id] || 0,
                };
            });

        // 두 소스를 합치고 동일 스토리는 가장 최근 완료만 유지
        // 정렬 보장을 위해 completedAt 내림차순으로 정렬 후 처음 등장하는 스토리만 채택
        const merged = [...result, ...resultFromCompleted]
            .filter((it) => it && Number.isFinite(Number(it.story_id)))
            .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
        const unique = new Map<number, any>();
        for (const item of merged) if (!unique.has(item.story_id)) unique.set(item.story_id, item);

        return NextResponse.json(Array.from(unique.values()));
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "casefiles get failed" }, { status: 500 });
    }
}
