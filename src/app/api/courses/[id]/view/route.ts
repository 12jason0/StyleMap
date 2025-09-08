import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    let connection;

    try {
        const { id: courseId } = await context.params;
        console.log("API: Incrementing view count for course:", courseId);

        connection = await pool.getConnection();
        console.log("API: Database connection successful");

        // 조회수 증가 (view_count 필드가 없으면 0으로 초기화 후 증가)
        const [result] = await connection.execute(
            "UPDATE courses SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?",
            [courseId]
        );

        const updateResult = result as { affectedRows: number };

        if (updateResult.affectedRows === 0) {
            return NextResponse.json({ error: "코스를 찾을 수 없습니다" }, { status: 404 });
        }

        console.log("API: View count incremented successfully");

        return NextResponse.json({ message: "조회수가 증가되었습니다" }, { status: 200 });
    } catch (error) {
        console.error("API: Error incrementing view count:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json({ error: "조회수 증가 실패", details: errorMessage }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
