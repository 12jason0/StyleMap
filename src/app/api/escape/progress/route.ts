import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({});
        const client: any = prisma as any;
        if (!client.userStoryProgress || typeof client.userStoryProgress.findMany !== "function") {
            return NextResponse.json({});
        }
        const rows = await client.userStoryProgress.findMany({ where: { user_id: Number(userId) } } as any);
        const map: Record<string, any> = {};
        rows.forEach((r: any) => {
            map[String(r.story_id)] = {
                story_id: r.story_id,
                current_chapter: r.current_chapter,
                status: r.status,
                started_at: r.started_at ? new Date(r.started_at).getTime() : null,
                completed_at: r.completed_at ? new Date(r.completed_at).getTime() : null,
            };
        });
        return NextResponse.json(map);
    } catch (e) {
        console.error("escape/progress GET error", e);
        return NextResponse.json({ error: "failed" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        const body = await request.json();
        const { story_id, current_chapter, status, started_at, completed_at } = body;
        if (!story_id || !current_chapter || !status) {
            return NextResponse.json({ error: "invalid" }, { status: 400 });
        }
        const row = await prisma.userStoryProgress.upsert({
            where: { user_id_story_id: { user_id: Number(userId), story_id: Number(story_id) } } as any,
            update: {
                current_chapter: Number(current_chapter),
                status,
                started_at: started_at ? new Date(started_at) : null,
                completed_at: completed_at ? new Date(completed_at) : null,
            },
            create: {
                user_id: Number(userId),
                story_id: Number(story_id),
                current_chapter: Number(current_chapter),
                status,
                started_at: started_at ? new Date(started_at) : null,
                completed_at: completed_at ? new Date(completed_at) : null,
            },
        } as any);
        return NextResponse.json({ ok: true, id: row.id });
    } catch (e) {
        console.error("escape/progress POST error", e);
        return NextResponse.json({ error: "failed" }, { status: 500 });
    }
}
