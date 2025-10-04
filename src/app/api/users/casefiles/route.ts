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
        const submissions = await prisma.missionSubmission.groupBy({
            by: ["chapterId"],
            where: { userId, photoUrl: { not: null }, chapter: { story_id: { in: storyIds } } },
            _count: { _all: true },
        });
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
            const chapters = await prisma.storyChapter.findMany({
                where: { story_id: { in: storyIds } },
                select: { id: true, story_id: true },
            });
            for (const ch of chapters) {
                const c = chapterIdToCount.get(ch.id) || 0;
                if (!photoCountByStory[ch.story_id]) photoCountByStory[ch.story_id] = 0;
                photoCountByStory[ch.story_id] += c;
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
