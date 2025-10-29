import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });

        // 사용자 보유 물주기 재고 확인
        const user: any = await (prisma as any).user.findUnique({ where: { id: Number(userId) } });
        const userWaterStock = Number((user as any)?.waterStock || 0);

        const tree = await (prisma as any).tree.findFirst({
            where: { userId, NOT: { status: "completed" } },
            orderBy: { createdAt: "desc" },
        });
        const REQUIRED = 15;
        if (!tree)
            return NextResponse.json({
                success: true,
                tree: null,
                required: REQUIRED,
                waterCount: 0,
                userWaterStock,
            });
        return NextResponse.json({
            success: true,
            tree,
            required: REQUIRED,
            waterCount: Math.min(tree.waterCount, REQUIRED),
            userWaterStock,
        });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}
