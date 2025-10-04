import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { extractBearerToken, verifyJwtAndGetUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const token = extractBearerToken(request);
        if (!token) return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });

        let userId: string;
        try {
            userId = verifyJwtAndGetUserId(token);
        } catch {
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }

        const updated = await prisma.user.update({
            where: { id: Number(userId) },
            data: { couponCount: { increment: 1 } },
            select: { couponCount: true },
        });

        return NextResponse.json({
            success: true,
            message: "쿠폰이 환불되었습니다.",
            ticketsRemaining: updated.couponCount,
        });
    } catch (err) {
        console.error("쿠폰 환불 오류", err);
        return NextResponse.json({ error: "쿠폰 환불 중 오류" }, { status: 500 });
    }
}
