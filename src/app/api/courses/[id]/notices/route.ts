import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        console.log("API: Fetching notices for course ID:", id);

        const courseId = parseInt(id);
        if (isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            const [notices] = await connection.execute(
                "SELECT id, notice_text, type, display_order FROM notices WHERE course_id = ? ORDER BY display_order ASC",
                [courseId]
            );

            console.log("API: Returning notices from database for course:", courseId);
            return NextResponse.json(notices);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching notices:", error);
        return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
    }
}
