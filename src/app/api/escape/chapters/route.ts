import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storyIdStr = searchParams.get("storyId");
        const storyId = Number(storyIdStr);
        if (!Number.isFinite(storyId) || storyId <= 0) {
            return NextResponse.json({ error: "Invalid storyId" }, { status: 400 });
        }

        const chapters = await prisma.storyChapter.findMany({
            where: { story_id: storyId },
            orderBy: [{ chapter_number: "asc" }],
        });

        const normalized = chapters.map((c) => ({
            id: c.id,
            story_id: c.story_id,
            chapter_number: c.chapter_number,
            title: c.title,
            location_name: c.location_name ?? undefined,
            address: c.address ?? undefined,
            latitude: c.latitude ? Number(c.latitude) : null,
            longitude: c.longitude ? Number(c.longitude) : null,
            story_text: c.story_text ?? undefined,
            mission_type: (c.mission_type as any) ?? undefined,
            mission_payload: c.mission_payload ?? undefined,
            puzzle_text: c.puzzle_text ?? undefined,
        }));

        return NextResponse.json(normalized, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 500 });
    }
}
