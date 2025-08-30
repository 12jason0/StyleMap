import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// 테스트용 후기 데이터 추가 (인증 불필요)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { courseId } = body;

        if (!courseId) {
            return NextResponse.json({ error: "courseId가 필요합니다." }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            // 테스트용 후기 데이터 삽입
            const [result] = await connection.execute(
                `INSERT INTO reviews (userId, courseId, placeId, rating, content, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                [1, parseInt(courseId), null, 5, "정말 좋은 코스였습니다! 다음에 또 방문하고 싶어요."]
            );

            const insertResult = result as any;

            return NextResponse.json({
                success: true,
                message: "테스트 후기가 추가되었습니다.",
                reviewId: insertResult.insertId,
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("테스트 후기 추가 오류:", error);
        return NextResponse.json({ error: "테스트 후기 추가 중 오류가 발생했습니다." }, { status: 500 });
    }
}
