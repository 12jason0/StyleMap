import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
    try {
        const rows = await prisma.collageTemplate.findMany({
            where: { isPublic: true },
            orderBy: { id: "asc" },
            select: { id: true, name: true, imageUrl: true, framesJson: true },
        });
        return NextResponse.json({ templates: rows });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Failed to load templates" }, { status: 500 });
    }
}

