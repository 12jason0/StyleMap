import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storyId = Number(searchParams.get("storyId"));
        if (!storyId) return NextResponse.json({ error: "storyId required" }, { status: 400 });
        const client: any = prisma as any;
        if (!client.storyChapter || typeof client.StoryChapter.findMany !== "function") {
            return NextResponse.json([]);
        }
        const rows = await client.storyChapter.findMany({
            where: { story_id: storyId },
            orderBy: { chapter_number: "asc" },
        } as any);

        return NextResponse.json(rows);
    } catch (e: any) {
        const msg = e?.message || String(e);
        if (msg.includes("does not exist") || msg.includes("Invalid\nprisma")) {
            return NextResponse.json([]);
        }
        console.error("escape/chapters GET error", e);
        return NextResponse.json({ error: "failed" }, { status: 500 });
    }
}
