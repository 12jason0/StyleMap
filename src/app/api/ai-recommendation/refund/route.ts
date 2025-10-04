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

        // 환불은 비즈니스 룰상 중복 환불을 방지해야 함
        // 옵션: idempotency-key 헤더가 있으면 최근 5분 내 동일 키 중복 환불 차단 (확장 포인트)
        // 여기서는 단순히 증가만 수행하되, 필요 시 환불 히스토리 테이블 추가 권장

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
