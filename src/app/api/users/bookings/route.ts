import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

const JWT_SECRET = "stylemap-secret-key-2024";

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
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const userId = decoded.userId;
            console.log("사용자 ID:", userId);

            const connection = await pool.getConnection();
            console.log("DB 연결 성공");

            try {
                // bookings 테이블이 존재하는지 확인
                console.log("bookings 테이블 확인 중...");
                const [tables] = await connection.execute("SHOW TABLES LIKE 'bookings'");
                const tablesArray = tables as any[];
                console.log("테이블 확인 결과:", tablesArray);

                if (tablesArray.length === 0) {
                    // bookings 테이블이 없으면 빈 배열 반환
                    console.log("bookings 테이블이 존재하지 않음, 빈 배열 반환");
                    return NextResponse.json({
                        success: true,
                        bookings: [],
                    });
                }

                console.log("bookings 테이블이 존재함, 예약 내역 조회 중...");
                const [bookings] = await connection.execute(
                    "SELECT b.id, c.title as course_title, b.bookingDate, b.status, b.totalPrice, b.participants FROM bookings b LEFT JOIN courses c ON b.courseId = c.id WHERE b.userId = ? ORDER BY b.bookingDate DESC",
                    [userId]
                );

                const bookingsArray = bookings as any[];
                console.log("조회된 예약 내역:", bookingsArray);

                const formattedBookings = bookingsArray.map((booking) => ({
                    id: booking.id,
                    courseTitle: booking.course_title || "알 수 없는 코스",
                    date: new Date(booking.bookingDate).toLocaleDateString("ko-KR"),
                    status: booking.status,
                    price: `${booking.totalPrice}원`,
                    participants: booking.participants,
                }));

                console.log("포맷된 예약 내역:", formattedBookings);

                return NextResponse.json({
                    success: true,
                    bookings: formattedBookings,
                });
            } finally {
                connection.release();
            }
        } catch (jwtError) {
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }
    } catch (error) {
        console.error("예약 내역 조회 오류:", error);
        return NextResponse.json({ error: "예약 내역 조회 중 오류가 발생했습니다." }, { status: 500 });
    }
}
