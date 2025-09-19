import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const userIdStr = getUserIdFromRequest(request);
        if (!userIdStr) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
        const userId = Number(userIdStr);
        const body = await request.json().catch(() => ({}));
        const storyId = Number(body?.storyId);
        if (!Number.isFinite(storyId)) {
            return NextResponse.json({ message: "storyId가 필요합니다." }, { status: 400 });
        }

        // 해당 스토리의 챕터 목록
        const chapters = await prisma.storyChapter.findMany({ where: { story_id: storyId }, select: { id: true } });
        const chapterIds = chapters.map((c) => c.id);

        // 사진/미션 제출 삭제
        if (chapterIds.length > 0) {
            await prisma.missionSubmission.deleteMany({ where: { userId, chapterId: { in: chapterIds } } });
        }

        // 진행도 삭제
        await prisma.userStoryProgress.deleteMany({ where: { user_id: userId, story_id: storyId } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ message: error?.message || "삭제 실패" }, { status: 500 });
    }
}
