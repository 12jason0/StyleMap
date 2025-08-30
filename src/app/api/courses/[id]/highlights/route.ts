import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("API: Fetching highlights for course ID:", courseId);

        const connection = await pool.getConnection();

        try {
            const [highlights] = await connection.execute(
                "SELECT id, title, description, icon FROM highlights WHERE course_id = ? ORDER BY id",
                [courseId]
            );

            const highlightsArray = highlights as Array<{
                id: number;
                title: string;
                description: string;
                icon: string;
            }>;
            console.log("API: Found highlights:", highlightsArray.length);

            return NextResponse.json(highlightsArray);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching highlights:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch highlights",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
