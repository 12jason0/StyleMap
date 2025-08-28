import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        console.log("API: Fetching contacts for course ID:", id);

        const courseId = parseInt(id);
        if (isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            const [contacts] = await connection.execute(
                "SELECT id, type, icon, label, value, description FROM contacts WHERE course_id = ? ORDER BY id ASC",
                [courseId]
            );

            console.log("API: Returning contacts from database for course:", courseId);
            return NextResponse.json(contacts);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching contacts:", error);
        return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
    }
}
