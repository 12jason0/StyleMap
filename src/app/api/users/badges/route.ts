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

// 로그인한 사용자의 모든 배지를 가져오는 GET 엔드포인트
export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) {
            return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
        }

        // 'include'를 사용하여 한 번의 쿼리로 관련된 배지 데이터를 함께 가져옵니다.
        const userBadges = await prisma.userBadge.findMany({
            where: { user_id: userId },
            orderBy: { awarded_at: "desc" },
            include: {
                badge: true, // Prisma가 관련된 Badge 객체도 함께 가져오도록 설정
            },
        });

        if (userBadges.length === 0) {
            return NextResponse.json([]);
        }

        // 데이터를 원하는 형식으로 매핑하고, 연결된 배지가 없는 경우를 필터링합니다.
        const result = userBadges
            .filter((userBadge) => userBadge.badge) // 배지 정보가 없는 레코드는 제외 (안전장치)
            .map((userBadge) => ({
                id: userBadge.badge.id,
                name: userBadge.badge.name,
                image_url: userBadge.badge.image_url ?? null,
                description: userBadge.badge.description ?? null,
                awarded_at: userBadge.awarded_at,
            }));

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Badge 조회 실패:", error);
        return NextResponse.json({ message: error?.message || "배지 조회에 실패했습니다." }, { status: 500 });
    }
}
