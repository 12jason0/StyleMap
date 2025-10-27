import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });

        const tree = await (prisma as any).tree.findFirst({
            where: { userId, NOT: { status: "completed" } },
            orderBy: { createdAt: "desc" },
        });
        const REQUIRED = 15;
        if (!tree) return NextResponse.json({ success: true, tree: null, required: REQUIRED, waterCount: 0 });
        return NextResponse.json({
            success: true,
            tree,
            required: REQUIRED,
            waterCount: Math.min(tree.waterCount, REQUIRED),
        });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}
