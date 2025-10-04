import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
        if (!Number.isFinite(userId)) return NextResponse.json({ success: false, error: "BAD_USER" }, { status: 400 });

        const checkins = await (prisma as any).userCheckin.findMany({
            where: { userId },
            orderBy: { date: "desc" },
            take: 120,
        });

        return NextResponse.json({ success: true, checkins });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
        if (!Number.isFinite(userId)) return NextResponse.json({ success: false, error: "BAD_USER" }, { status: 400 });

        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const existing = await (prisma as any).userCheckin.findFirst({
            where: { userId, date: { gte: start, lt: end } },
        });
        if (existing) {
            return NextResponse.json({ success: true, alreadyChecked: true, awarded: existing.rewarded });
        }

        const created = await (prisma as any).userCheckin.create({ data: { userId, date: now, rewarded: false } });

        const total = await (prisma as any).userCheckin.count({ where: { userId } });
        let awarded = false;
        if (total % 7 === 0) {
            // 7회 달성 → 쿠폰 7개 지급
            await (prisma as any).$transaction([
                (prisma as any).userReward.create({
                    data: { userId, type: "checkin", amount: 7, unit: "coupon" as any },
                }),
                (prisma as any).user.update({ where: { id: userId }, data: { couponCount: { increment: 7 } } }),
                (prisma as any).userCheckin.update({ where: { id: created.id }, data: { rewarded: true } }),
            ]);
            awarded = true;
        }

        return NextResponse.json({ success: true, alreadyChecked: false, awarded });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}
