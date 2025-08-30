import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("API: Fetching notices for course ID:", courseId);

        const connection = await pool.getConnection();

        try {
            console.log("API: Executing query for course ID:", courseId);

            const [notices] = await connection.execute(
                "SELECT id, notice_text, display_order FROM course_notices WHERE course_id = ? ORDER BY display_order, id",
                [courseId]
            );

            const noticesArray = notices as Array<{
                id: number;
                notice_text: string;
                display_order: number;
            }>;
            console.log("API: Found notices from course_notices table:", noticesArray.length);
            console.log("API: Notices data:", noticesArray);

            return NextResponse.json(noticesArray);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching notices:", error);
        console.error("API: Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : "No stack trace",
        });
        return NextResponse.json(
            {
                error: "Failed to fetch notices",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
