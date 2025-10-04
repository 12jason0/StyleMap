import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
        if (!Number.isFinite(userId)) return NextResponse.json({ success: false, error: "BAD_USER" }, { status: 400 });

        const rewards = await prisma.userReward.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json({ success: true, rewards });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}
