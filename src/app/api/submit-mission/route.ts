import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import { getJwtSecret, resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        const body = (await request.json()) as any;
        console.log("[/api/submit-mission] incoming", {
            chapterId: body?.chapterId,
            hasPhotos: Array.isArray(body?.photoUrls) || Array.isArray(body?.photo_urls),
            photosLen: Array.isArray(body?.photoUrls)
                ? body?.photoUrls?.length
                : Array.isArray(body?.photo_urls)
                ? body?.photo_urls?.length
                : null,
            isCorrect: body?.isCorrect,
        });

        // 통합 인증: Authorization 헤더 또는 auth 쿠키 허용
        let resolvedUserId = resolveUserId(request);
        if (!resolvedUserId) {
            // 구버전 호환: auth 쿠키 직접 파싱
            const token = request.cookies.get("auth")?.value;
            if (token) {
                try {
                    const payload = jwt.verify(token, getJwtSecret()) as { userId?: number | string };
                    if (payload?.userId) resolvedUserId = Number(payload.userId);
                } catch {}
            }
        }
        if (!Number.isFinite(Number(resolvedUserId))) {
            return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
        }
        resolvedUserId = Number(resolvedUserId);

        if (!body?.chapterId) {
            return NextResponse.json({ message: "chapterId가 필요합니다." }, { status: 400 });
        }

        const photoUrls: string[] | undefined = body?.photoUrls || body?.photo_urls;
        const { chapterId, isCorrect = false, textAnswer } = body as SubmitMissionBody;
        if (!Number.isFinite(Number(chapterId))) {
            return NextResponse.json({ message: "유효하지 않은 chapterId" }, { status: 400 });
        }

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
            console.log("[/api/submit-mission] photo createMany count=", created.count);
            return NextResponse.json({ success: true, type: "photo", count: created.count });
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
        console.log("[/api/submit-mission] text create id=", created.id);
        return NextResponse.json({ success: true, type: "text", id: created.id });
    } catch (error: any) {
        console.error("[/api/submit-mission] ERROR", error);
        return NextResponse.json({ message: error?.message || "저장 실패" }, { status: 500 });
    }
}
