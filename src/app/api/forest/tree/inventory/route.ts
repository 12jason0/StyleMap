import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json({ success: true, trees: [] });
        const trees = await (prisma as any).tree.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true, variant: true, status: true, waterCount: true, createdAt: true },
        });
        return NextResponse.json({ success: true, trees });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}

