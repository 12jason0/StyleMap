import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("API: Fetching highlights for course ID:", courseId);

        const connection = await pool.getConnection();

        try {
            const [highlights] = await connection.execute(
                "SELECT id, title, description, icon FROM highlights WHERE course_id = ?",
                [courseId]
            );

            console.log("API: Returning highlights from database");
            return NextResponse.json(highlights);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching highlights:", error);
        return NextResponse.json({ error: "Failed to fetch highlights" }, { status: 500 });
    }
}
