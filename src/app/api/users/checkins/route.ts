import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function computeConsecutiveStreak(sortedDescCheckins: { date: Date }[], now: Date): number {
    if (sortedDescCheckins.length === 0) return 0;
    let streak = 0;
    let expected = startOfDay(now);
    for (const c of sortedDescCheckins) {
        const day = startOfDay(new Date(c.date));
        if (isSameDay(day, expected)) {
            streak += 1;
            expected = new Date(expected);
            expected.setDate(expected.getDate() - 1);
            continue;
        }
        // 허용되는 것은 정확히 연속된 하루씩만. 하나라도 비면 스트릭 종료
        break;
    }
    return streak;
}

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

        const now = new Date();
        const streak = computeConsecutiveStreak(checkins, now);

        return NextResponse.json({ success: true, checkins, streak });
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
            // 이미 오늘 체크한 경우에도 최신 스트릭을 계산하여 반환
            const recent = await (prisma as any).userCheckin.findMany({
                where: { userId },
                orderBy: { date: "desc" },
                take: 120,
            });
            const streak = computeConsecutiveStreak(recent, now);
            return NextResponse.json({ success: true, alreadyChecked: true, awarded: existing.rewarded, streak });
        }

        const created = await (prisma as any).userCheckin.create({ data: { userId, date: now, rewarded: false } });

        // 연속 출석 스트릭 계산 (오늘 방금 체크 포함)
        const recent = await (prisma as any).userCheckin.findMany({
            where: { userId },
            orderBy: { date: "desc" },
            take: 120,
        });
        const streak = computeConsecutiveStreak(recent, now);

        let awarded = false;
        // 7일 연속 달성 시 보상 지급, 하루라도 빠지면 streak가 1부터 다시 시작
        if (streak > 0 && streak % 7 === 0) {
            await (prisma as any).$transaction([
                (prisma as any).userReward.create({
                    data: { userId, type: "checkin", amount: 7, unit: "coupon" as any },
                }),
                (prisma as any).user.update({ where: { id: userId }, data: { couponCount: { increment: 7 } } }),
                (prisma as any).userCheckin.update({ where: { id: created.id }, data: { rewarded: true } }),
            ]);
            awarded = true;
        }

        return NextResponse.json({ success: true, alreadyChecked: false, awarded, streak });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}
