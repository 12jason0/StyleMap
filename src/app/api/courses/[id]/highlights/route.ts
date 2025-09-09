import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("API: Fetching highlights for course ID:", courseId);
        const rows = await (prisma as any).highlights.findMany({
            where: { course_id: Number(courseId) },
            orderBy: [{ id: "asc" }],
            select: { id: true, title: true, description: true, icon: true },
        });
        console.log("API: Found highlights:", rows.length);
        return NextResponse.json(rows);
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
