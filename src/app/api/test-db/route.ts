import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
    try {
        const connection = await pool.getConnection();

        try {
            // 데이터베이스 연결 테스트
            const [result] = await connection.execute("SELECT 1 as test");
            console.log("DB 연결 성공:", result);

            // users 테이블 확인
            const [users] = await connection.execute("SELECT COUNT(*) as count FROM users");
            console.log("Users 테이블:", users);

            return NextResponse.json({
                success: true,
                message: "데이터베이스 연결 성공",
                test: result,
                userCount: users,
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("데이터베이스 연결 오류:", error);
        return NextResponse.json(
            {
                error: "데이터베이스 연결 실패",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
