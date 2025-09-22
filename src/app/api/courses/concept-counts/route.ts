import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
    try {
        console.log("API: Starting to fetch concept counts...");
        const conceptCounts = await (prisma as any).courses.groupBy({
            by: ["concept"],
            where: { concept: { not: null } },
            _count: { concept: true },
        });
        const counts: Record<string, number> = Object.fromEntries(
            (conceptCounts as any[])
                .filter((c) => c.concept)
                .map((c) => [c.concept as string, Number(c._count?.concept || 0)])
        );

        return NextResponse.json(counts, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
        });
    } catch (error) {
        console.error("API: Error fetching concept counts:", error);
        return NextResponse.json({ error: "concept 개수를 가져오는 중 오류 발생" }, { status: 500 });
    }
}
