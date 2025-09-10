import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/db";
import { getJwtSecret } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        console.log("예약 내역 조회 시작");
        const authHeader = request.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("인증 토큰 없음");
            return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
        }

        const token = authHeader.substring(7);
        console.log("토큰 확인됨");

        try {
            const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
            const userId = decoded.userId;
            console.log("사용자 ID:", userId);

            const bookingsArray = (await (prisma as any).booking.findMany({
                where: { userId: Number(userId) },
                orderBy: { bookingDate: "desc" },
                select: {
                    id: true,
                    courseTitle: true,
                    bookingDate: true,
                    status: true,
                    price: true,
                    participants: true,
                },
            })) as any[];
            console.log("조회된 예약 내역:", bookingsArray);

            // 예약 내역이 없어도 정상적으로 처리
            const formattedBookings = bookingsArray.map((b) => ({
                id: b.id,
                courseTitle: (b as any).courseTitle || "알 수 없는 코스",
                date: new Date((b as any).bookingDate as any).toLocaleDateString("ko-KR"),
                status: b.status,
                price: b.price,
                participants: b.participants,
            }));

            console.log("포맷된 예약 내역:", formattedBookings);

            // 예약 내역이 없어도 성공 응답 반환
            return NextResponse.json({
                success: true,
                bookings: formattedBookings,
            });
        } catch {
            console.error("JWT 토큰 검증 실패");
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }
    } catch (error) {
        console.error("예약 내역 조회 오류:", error);
        return NextResponse.json({ error: "예약 내역 조회 중 오류가 발생했습니다." }, { status: 500 });
    }
}
