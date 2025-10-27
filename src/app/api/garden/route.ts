import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        // 비로그인 사용자도 페이지 접근이 가능하도록 200으로 응답하고 빈 정원을 반환
        if (!userId) return NextResponse.json({ success: true, garden: null });
        const garden = await (prisma as any).garden.findUnique({
            where: { userId },
            include: { gardenTrees: true },
        });
        return NextResponse.json({ success: true, garden });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}
