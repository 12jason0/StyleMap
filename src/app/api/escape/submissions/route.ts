import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const userIdStr = getUserIdFromRequest(request);
        if (!userIdStr) {
            return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
        }
        const userId = Number(userIdStr);
        const { searchParams } = new URL(request.url);
        const storyId = Number(searchParams.get("storyId"));
        if (!Number.isFinite(storyId)) {
            return NextResponse.json({ message: "storyId가 필요합니다." }, { status: 400 });
        }

        const submissions = await prisma.missionSubmission.findMany({
            where: {
                userId,
                photoUrl: { not: null },
                chapter: { story_id: storyId },
            },
            orderBy: { createdAt: "asc" },
            select: { photoUrl: true },
        });

        const urls = submissions.map((s) => s.photoUrl!).filter(Boolean);
        return NextResponse.json({ success: true, urls });
    } catch (error: any) {
        return NextResponse.json({ message: error?.message || "조회 실패" }, { status: 500 });
    }
}
