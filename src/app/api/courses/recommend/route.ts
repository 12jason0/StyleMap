import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(_request: NextRequest) {
    try {
        // ✅ [수정됨] prisma.courses -> prisma.course
        const courses = await prisma.course.findMany({
            where: { isPopular: true },
            take: 5,
            orderBy: { rating: "desc" },
        });
        return NextResponse.json(courses);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
    }
}
