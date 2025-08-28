import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("API: Fetching benefits for course ID:", courseId);

        const connection = await pool.getConnection();

        try {
            const [benefits] = await connection.execute(
                "SELECT id, title, description, icon FROM benefits WHERE course_id = ?",
                [courseId]
            );

            console.log("API: Returning benefits from database");
            return NextResponse.json(benefits);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching benefits:", error);
        return NextResponse.json({ error: "Failed to fetch benefits" }, { status: 500 });
    }
}
