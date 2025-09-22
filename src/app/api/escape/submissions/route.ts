import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest, getJwtSecret } from "@/lib/auth";
import jwt from "jsonwebtoken";

// Bearer 토큰 또는 'auth' 쿠키에서 사용자 ID를 가져오는 헬퍼 함수
function resolveUserId(request: NextRequest): number | null {
    const fromHeader = getUserIdFromRequest(request);
    if (fromHeader && Number.isFinite(Number(fromHeader))) {
        return Number(fromHeader);
    }
    const token = request.cookies.get("auth")?.value;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, getJwtSecret()) as { userId?: number | string };
        if (payload?.userId) return Number(payload.userId);
    } catch {}
    return null;
}

export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request); // <-- 수정된 부분
        if (!userId) {
            return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
        }

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

        const urls = submissions.map((s: { photoUrl: string | null }) => s.photoUrl!).filter(Boolean) as string[];
        return NextResponse.json({ success: true, urls });
    } catch (error: any) {
        return NextResponse.json({ message: error?.message || "조회 실패" }, { status: 500 });
    }
}
