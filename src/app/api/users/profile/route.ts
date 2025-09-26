import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        // ✅ [수정됨] prisma.users -> prisma.user
        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            select: {
                id: true,
                email: true,
                username: true,
                profileImageUrl: true,
                provider: true,
                mbti: true,
                age: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("프로필 정보 가져오기 오류:", error);
        return NextResponse.json({ error: "프로필 정보를 가져오는 중 오류 발생" }, { status: 500 });
    }
}
