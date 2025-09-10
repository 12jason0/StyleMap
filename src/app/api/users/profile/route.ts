import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { extractBearerToken, verifyJwtAndGetUserId } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        console.log("=== 프로필 API 시작 ===");
        const token = extractBearerToken(request);
        if (!token) {
            console.log("인증 토큰 없음");
            return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
        }
        console.log("토큰 확인됨");

        try {
            console.log("JWT 토큰 검증 중...");
            const userId = verifyJwtAndGetUserId(token);
            console.log("사용자 ID:", userId);

            const user = await (prisma as any).user.findUnique({
                where: { id: Number(userId) },
                select: {
                    id: true,
                    email: true,
                    nickname: true,
                    profileImageUrl: true,
                    mbti: true,
                    age: true,
                    createdAt: true,
                },
            });

            if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

            return NextResponse.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: (user as any).nickname,
                    profileImage: (user as any).profileImageUrl || null,
                    mbti: user.mbti || null,
                    age: user.age || null,
                    joinDate: new Date(user.createdAt as any).toLocaleDateString("ko-KR"),
                },
            });
        } catch {
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }
    } catch (error) {
        console.error("프로필 조회 오류:", error);
        return NextResponse.json({ error: "프로필 조회 중 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const token = extractBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
        }
        const { name, email, mbti, age } = await request.json();

        try {
            const userId = verifyJwtAndGetUserId(token);

            // 이메일 중복 확인 (자신의 이메일 제외)
            const exists = await (prisma as any).user.findFirst({
                where: { email, NOT: { id: Number(userId) } },
                select: { id: true },
            });
            if (exists) return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });

            await (prisma as any).user.update({
                where: { id: Number(userId) },
                data: { nickname: name, email, mbti, age },
            });

            return NextResponse.json({
                success: true,
                message: "프로필이 성공적으로 수정되었습니다.",
                user: {
                    id: userId,
                    email,
                    name,
                    mbti,
                    age,
                },
            });
        } catch {
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }
    } catch (error) {
        console.error("프로필 수정 오류:", error);
        return NextResponse.json({ error: "프로필 수정 중 오류가 발생했습니다." }, { status: 500 });
    }
}
