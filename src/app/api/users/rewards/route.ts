import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userIdStr = getUserIdFromRequest(request);
        if (!userIdStr) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
        const userId = Number(userIdStr);
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
