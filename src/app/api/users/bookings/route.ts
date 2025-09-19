// src/app/api/users/bookings/route.ts

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/db";
import { getJwtSecret, getUserIdFromRequest } from "@/lib/auth"; // getUserIdFromRequest 임포트
export const dynamic = "force-dynamic";

// --- ⬇️ 수정된 부분 ⬇️ ---
// Bearer 토큰 또는 'auth' 쿠키에서 사용자 ID를 가져오는 헬퍼 함수 (위 badges API와 동일)
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
// --- ⬆️ 여기까지 수정되었습니다 ⬆️ ---

export async function GET(request: NextRequest) {
    try {
        console.log("예약 내역 조회 시작");

        // --- ⬇️ 수정된 부분 ⬇️ ---
        // 통일된 인증 헬퍼 함수 사용
        const userId = resolveUserId(request);
        // --- ⬆️ 여기까지 수정되었습니다 ⬆️ ---

        if (!userId) {
            console.log("인증 정보 없음");
            return NextResponse.json({ error: "인증 정보가 필요합니다." }, { status: 401 });
        }

        console.log("사용자 ID:", userId);

        const bookingsArray = await prisma.booking.findMany({
            where: { user_id: userId },
            orderBy: { booking_date: "desc" },
            select: {
                id: true,
                course_title: true,
                booking_date: true,
                status: true,
                price: true,
                participants: true,
            },
        });

        console.log("조회된 예약 내역:", bookingsArray);

        const formattedBookings = bookingsArray.map((b) => ({
            id: b.id,
            courseTitle: b.course_title || "알 수 없는 코스",
            date: new Date(b.booking_date).toLocaleDateString("ko-KR"),
            status: b.status,
            price: b.price,
            participants: b.participants,
        }));

        return NextResponse.json({
            success: true,
            bookings: formattedBookings,
        });
    } catch (error) {
        console.error("예약 내역 조회 오류:", error);
        return NextResponse.json({ error: "예약 내역 조회 중 오류가 발생했습니다." }, { status: 500 });
    }
}
