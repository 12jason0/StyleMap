import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// 중복 선언을 피하기 위해 함수를 최상단에 한번만 정의합니다.
const normalizeLevel = (v: unknown): number => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (v === null || v === undefined) return 0;
    let str = String(v).trim();
    // 전각 숫자(０-９) → 반각
    str = str.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
    const n = parseInt(str, 10);
    return Number.isFinite(n) ? n : 0;
};

// story 객체를 프론트엔드 형식에 맞게 변환하는 함수입니다.
const normalizeStory = (s: any) => {
    // ✅ [수정됨] Prisma의 camelCase 변환 규칙(epilogue_text -> epilogueText)을 고려합니다.
    const epilogueFromField = s.epilogueText ?? s.epilogue_text;

    const safeEpilogue = (() => {
        // 1. 데이터베이스의 epilogue_text 컬럼 값을 최우선으로 사용합니다.
        if (epilogueFromField != null && epilogueFromField !== "") {
            return epilogueFromField;
        }
        // 2. 만약 위 값이 비어있다면, JSON 필드에서 한번 더 찾아봅니다 (폴백 로직).
        try {
            const storyJson = s.story_json;
            if (storyJson && typeof storyJson === "object") {
                return storyJson.epilogue_text ?? storyJson.epilogue ?? "";
            }
        } catch {}
        // 3. 모든 경우에 값이 없으면 빈 문자열을 반환합니다.
        return "";
    })();

    return {
        id: s.id,
        title: s.title,
        synopsis: s.synopsis ?? "",
        epilogue_text: safeEpilogue,
        region: s.region ?? null,
        price: s.price != null ? String(s.price) : null,
        imageUrl: s.imageUrl ?? null,
        reward_badge_id: s.reward_badge_id ?? null,
        level: normalizeLevel(s.level),
        is_active: s.is_active,
        created_at: s.created_at,
        updated_at: s.updated_at,
        badge: s.reward_badge
            ? {
                  id: s.reward_badge.id,
                  name: s.reward_badge.name,
                  description: s.reward_badge.description ?? "",
                  image_url: s.reward_badge.image_url ?? undefined,
              }
            : null,
    };
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storyId = searchParams.get("storyId");

        if (storyId) {
            const idNum = Number(storyId);
            if (!Number.isFinite(idNum)) {
                return NextResponse.json({ error: "Invalid storyId" }, { status: 400 });
            }

            // Prisma 쿼리는 기본적으로 모든 스칼라 필드를 가져오므로 epilogue_text도 포함됩니다.
            const story = await prisma.story.findUnique({
                where: { id: idNum },
                include: { reward_badge: true },
            });

            if (!story || !story.is_active) {
                return NextResponse.json({ error: "Story not found" }, { status: 404 });
            }

            const normalized = normalizeStory(story);

            return NextResponse.json(normalized, {
                headers: {
                    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
                },
            });
        }

        const stories = await prisma.story.findMany({
            where: { is_active: true },
            orderBy: [{ id: "asc" }],
            include: {
                reward_badge: true,
            },
        });

        // 여러 스토리를 변환할 때도 동일한 함수를 사용합니다.
        const normalizedStories = stories.map(normalizeStory);

        return NextResponse.json(normalizedStories, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
        });
    } catch (error) {
        console.error("Failed to fetch stories:", error);
        return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
    }
}
