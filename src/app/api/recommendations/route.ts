import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const userIdStr = getUserIdFromRequest(req);
        const { searchParams } = new URL(req.url);
        const limit = Math.min(Math.max(Number(searchParams.get("limit") || 6), 1), 24);
        if (!userIdStr) {
            // 비로그인: 인기 코스 반환 (섹션이 비지 않도록 폴백)
            const popular = await prisma.course.findMany({ orderBy: { view_count: "desc" }, take: limit });
            return NextResponse.json({ recommendations: popular });
        }
        const userId = Number(userIdStr);

        // 최근 상호작용 10개 추출
        const recent = await prisma.userInteraction.findMany({
            where: { userId, action: { in: ["view", "click", "like"] } },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { course: { select: { id: true, concept: true, region: true } } },
        });

        if (!recent || recent.length === 0) {
            const popular = await prisma.course.findMany({ orderBy: { view_count: "desc" }, take: limit });
            return NextResponse.json({ recommendations: popular });
        }

        const concepts = recent.map((r) => r.course?.concept).filter(Boolean) as string[];
        const regions = recent.map((r) => r.course?.region).filter(Boolean) as string[];

        const topConcept = concepts
            .slice()
            .sort((a, b) => concepts.filter((x) => x === a).length - concepts.filter((x) => x === b).length)
            .pop();

        const topRegion = regions
            .slice()
            .sort((a, b) => regions.filter((x) => x === a).length - regions.filter((x) => x === b).length)
            .pop();

        const recs = await prisma.course.findMany({
            where: {
                OR: [...(topConcept ? [{ concept: topConcept }] : []), ...(topRegion ? [{ region: topRegion }] : [])],
            },
            orderBy: { rating: "desc" },
            take: limit,
        });

        return NextResponse.json({ recommendations: recs });
    } catch (e) {
        console.error("Recommendation error:", e);
        return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 });
    }
}
