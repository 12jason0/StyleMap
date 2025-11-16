import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }
        const body = await request.json().catch(() => ({}));
        const placeId = Number(body?.placeId);
        if (!Number.isFinite(placeId) || placeId <= 0) {
            return NextResponse.json({ error: "유효한 placeId가 필요합니다." }, { status: 400 });
        }

        // place가 실제 존재하는지 확인(선택)
        const place = await prisma.placeOption.findUnique({ where: { id: placeId }, select: { id: true } });
        if (!place) {
            return NextResponse.json({ error: "장소를 찾을 수 없습니다." }, { status: 404 });
        }

        // 트랜잭션: 중복 지급 방지 (UserReward: userId+placeId+type 유니크)
        const result = await prisma.$transaction(async (tx) => {
            // 이미 동일 장소에 같은 타입의 보상이 지급되었는지 확인
            const exists = await tx.userReward.findFirst({
                where: { userId, placeId, type: "escape_place_clear" as any },
                select: { id: true },
            } as any);
            if (exists) {
                const user = await tx.user.findUnique({ where: { id: userId }, select: { couponCount: true } });
                return { awarded: false, ticketsRemaining: user?.couponCount ?? 0 };
            }
            // 지급 기록 생성 (UserReward)
            await tx.userReward.create({
                data: {
                    userId,
                    placeId,
                    amount: 1,
                    unit: "coupon" as any,
                    type: "escape_place_clear" as any,
                },
            } as any);
            // 쿠폰 +1
            const updated = await tx.user.update({
                where: { id: userId },
                data: { couponCount: { increment: 1 } },
                select: { couponCount: true },
            });
            return { awarded: true, ticketsRemaining: updated.couponCount };
        });

        return NextResponse.json(result);
    } catch (e: any) {
        // Prisma unique 오류도 포함하여 모두 500 처리
        return NextResponse.json({ error: "쿠폰 지급 중 오류가 발생했습니다." }, { status: 500 });
    }
}


