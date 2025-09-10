import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await context.params;
        console.log("API: Incrementing view count for course:", courseId);

        const updated = await (prisma as any).courses.update({
            where: { id: Number(courseId) },
            data: { view_count: { increment: 1 } },
            select: { id: true },
        });

        if (!updated) {
            return NextResponse.json({ error: "코스를 찾을 수 없습니다" }, { status: 404 });
        }

        console.log("API: View count incremented successfully");

        return NextResponse.json({ message: "조회수가 증가되었습니다" }, { status: 200 });
    } catch (error) {
        console.error("API: Error incrementing view count:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json({ error: "조회수 증가 실패", details: errorMessage }, { status: 500 });
    }
}
