import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("API: Fetching benefits for course ID:", courseId);

        const connection = await pool.getConnection();

        try {
            const [benefits] = await connection.execute(
                "SELECT id, benefit_text, category, display_order FROM benefits WHERE course_id = ? ORDER BY display_order, id",
                [courseId]
            );

            const benefitsArray = benefits as Array<{
                id: number;
                benefit_text: string;
                category: string;
                display_order: number;
            }>;
            console.log("API: Found benefits:", benefitsArray.length);

            return NextResponse.json(benefitsArray);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching benefits:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch benefits",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
