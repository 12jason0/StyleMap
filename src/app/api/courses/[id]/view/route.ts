import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// 현재 조회수 가져오기
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const courseId = Number(id);
        if (!Number.isFinite(courseId)) {
            return NextResponse.json({ success: false, error: "Invalid course id" }, { status: 400 });
        }

        const row = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, view_count: true } });
        if (!row) return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });
        return NextResponse.json({ success: true, view_count: row.view_count });
    } catch (e) {
        console.error("GET /api/courses/[id]/view error", e);
        return NextResponse.json({ success: false, error: "Failed to fetch view count" }, { status: 500 });
    }
}

// 조회수 증가 (비로그인 포함)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const courseId = Number(id);
        if (!Number.isFinite(courseId)) {
            return NextResponse.json({ success: false, error: "Invalid course id" }, { status: 400 });
        }

        const updated = await prisma.course.update({
            where: { id: courseId },
            data: { view_count: { increment: 1 } },
            select: { id: true, view_count: true },
        });

        return NextResponse.json({ success: true, view_count: updated.view_count });
    } catch (error) {
        console.error("API: Error incrementing view count:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
