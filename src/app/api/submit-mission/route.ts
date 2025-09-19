import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/auth";

// 요청 바디 타입 정의
type SubmitMissionBody = {
    userId: number; // 실제 로그인 유저 ID로 대체 필요
    chapterId: number;
    isCorrect?: boolean;
    textAnswer?: string;
    photoUrls?: string[]; // PHOTO 미션일 경우 업로드된 URL 배열
};

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as SubmitMissionBody;

        // 인증 쿠키에서 userId 추출 (서버에서 강제 주입)
        const token = request.cookies.get("auth")?.value;
        if (!token) {
            return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
        }
        const payload = jwt.verify(token, getJwtSecret()) as { userId?: number | string };
        const resolvedUserId = payload?.userId ? Number(payload.userId) : NaN;
        if (!Number.isFinite(resolvedUserId)) {
            return NextResponse.json({ message: "유효하지 않은 사용자입니다." }, { status: 401 });
        }

        if (!body?.chapterId) {
            return NextResponse.json({ message: "chapterId가 필요합니다." }, { status: 400 });
        }

        const { chapterId, isCorrect = false, textAnswer, photoUrls } = body;

        // PHOTO 미션: URL 배열 각각을 별도 레코드로 저장
        if (Array.isArray(photoUrls) && photoUrls.length > 0) {
            const created = await prisma.missionSubmission.createMany({
                data: photoUrls.map((url) => ({
                    userId: resolvedUserId,
                    chapterId,
                    isCorrect,
                    photoUrl: url,
                })),
            });
            return NextResponse.json({ success: true, count: created.count });
        }

        // 텍스트/객관식 정답 등은 textAnswer로 저장
        const created = await prisma.missionSubmission.create({
            data: {
                userId: resolvedUserId,
                chapterId,
                isCorrect,
                textAnswer: textAnswer ?? null,
            },
        });

        return NextResponse.json({ success: true, data: created });
    } catch (error: any) {
        return NextResponse.json({ message: error?.message || "저장 실패" }, { status: 500 });
    }
}
