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

        // 원자적 차감을 위해 조건부 updateMany + 조회를 트랜잭션으로 실행
        const [decrementResult, latest] = await prisma.$transaction([
            prisma.user.updateMany({
                where: { id: Number(userId), couponCount: { gte: 1 } },
                data: { couponCount: { decrement: 1 } },
            }),
            prisma.user.findUnique({ where: { id: Number(userId) }, select: { couponCount: true } }),
        ]);

        if (!latest) return NextResponse.json({ error: "유저를 찾을 수 없습니다." }, { status: 404 });
        if (decrementResult.count === 0) {
            // 동시성/연타 시에도 0 미만으로 내려가지 않도록 방어
            return NextResponse.json(
                { error: "사용 가능한 쿠폰이 없습니다.", ticketsRemaining: latest.couponCount },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "쿠폰이 사용되었습니다.",
            ticketsRemaining: latest.couponCount,
        });
    } catch (err) {
        console.error("쿠폰 사용 오류", err);
        return NextResponse.json({ error: "쿠폰 사용 중 오류" }, { status: 500 });
    }
}
