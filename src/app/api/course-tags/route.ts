// src/app/api/course-tags/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
	try {
		const tags = await prisma.courseTag.findMany({
			orderBy: { name: "asc" },
			select: { id: true, name: true },
		});
		return NextResponse.json({ success: true, tags });
	} catch (error) {
		console.error("GET /api/course-tags error:", error);
		return NextResponse.json({ success: false, error: "Failed to fetch course tags" }, { status: 500 });
	}
}


