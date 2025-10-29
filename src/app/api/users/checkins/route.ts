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

function startOfWeekMonday(date: Date): Date {
    const d = startOfDay(date);
    const day = d.getDay(); // 0=Sun,1=Mon,...
    const mondayOffset = (day + 6) % 7;
    d.setDate(d.getDate() - mondayOffset);
    return d;
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

// 보상(award)된 날을 기준으로 다음날부터 스트릭을 1부터 다시 시작
function computeEffectiveStreak(sortedDescCheckins: { date: Date; rewarded?: boolean }[], now: Date): number {
    const lastRewarded = sortedDescCheckins.find((c) => c.rewarded === true);
    if (!lastRewarded) {
        return computeConsecutiveStreak(sortedDescCheckins, now);
    }
    // 같은 날 보상이 발생한 경우, 그 날은 7개 달성 상태로 표기
    if (isSameDay(startOfDay(new Date(lastRewarded.date)), startOfDay(now))) {
        return 7;
    }
    // 보상 발생일 이후부터 다시 1부터 연속 계산
    const cutoff = startOfDay(new Date(lastRewarded.date));
    const filtered = sortedDescCheckins.filter((c) => startOfDay(new Date(c.date)) > cutoff);
    return computeConsecutiveStreak(filtered, now);
}

// 보상일 기반 7칸 사이클 도장 배열 생성
function buildCycleStamps(sortedDescCheckins: { date: Date; rewarded?: boolean }[], now: Date): boolean[] {
    const todayStart = startOfDay(now);
    const lastRewarded = sortedDescCheckins.find((c) => c.rewarded === true);

    let cycleStart = new Date(todayStart);
    // 보상 당일: 7칸 모두 채워서 보여주기 위해 오늘-6일부터 표시
    if (lastRewarded && isSameDay(startOfDay(new Date(lastRewarded.date)), todayStart)) {
        cycleStart.setDate(cycleStart.getDate() - 6);
    } else if (lastRewarded) {
        // 보상 다음날부터 1칸부터 시작
        const rewardedDay = startOfDay(new Date(lastRewarded.date));
        cycleStart = new Date(rewardedDay);
        cycleStart.setDate(cycleStart.getDate() + 1);
    } else {
        // 보상 이력 없으면 현재 유효 스트릭 길이에 맞춰 시작점 계산
        const effective = computeConsecutiveStreak(sortedDescCheckins, now);
        cycleStart.setDate(cycleStart.getDate() - Math.max(0, effective - 1));
    }

    const dayKey = (d: Date) => {
        const sd = startOfDay(d);
        return `${sd.getFullYear()}-${sd.getMonth()}-${sd.getDate()}`;
    };
    const checkedDaySet = new Set(sortedDescCheckins.map((c) => dayKey(new Date(c.date))));

    const stamps = Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(cycleStart);
        dt.setDate(cycleStart.getDate() + i);
        return checkedDaySet.has(dayKey(dt));
    });

    return stamps;
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
        const streak = computeEffectiveStreak(checkins, now);

        // 오늘 출석 여부
        const todayStart = startOfDay(new Date(now));
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const todayChecked = checkins.some((c: { date: Date }) => {
            const d = new Date(c.date);
            return d >= todayStart && d < todayEnd;
        });

        // 보상일 기준 7칸 사이클 도장 배열 (요구사항에 맞춰 weekStamps 명칭 유지)
        const weekStamps = buildCycleStamps(checkins, now);
        const weekCount = weekStamps.filter(Boolean).length;

        return NextResponse.json({ success: true, checkins, streak, todayChecked, weekCount, weekStamps });
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
            const streak = computeEffectiveStreak(recent, now);
            return NextResponse.json({ success: true, alreadyChecked: true, awarded: existing.rewarded, streak });
        }

        const created = await (prisma as any).userCheckin.create({ data: { userId, date: now, rewarded: false } });

        // 연속 출석 스트릭 및 사이클 카운트 계산 (오늘 방금 체크 포함)
        const recent = await (prisma as any).userCheckin.findMany({
            where: { userId },
            orderBy: { date: "desc" },
            take: 120,
        });
        const effectiveStreak = computeEffectiveStreak(recent, now);

        // 보상일 기준 7칸 사이클 도장 배열 및 카운트
        const weekStamps = buildCycleStamps(recent, now);
        const weekCount = weekStamps.filter(Boolean).length;
        const todayStart = startOfDay(now);
        const hasRewardedToday = recent.some(
            (c: { date: Date; rewarded?: boolean }) => c.rewarded === true && isSameDay(new Date(c.date), todayStart)
        );

        let awarded = false;
        // 7개 달성 시 쿠폰 3개 + 물 주기 2개 지급 — 당일 중복 보상 방지
        if (effectiveStreak === 7 && !hasRewardedToday) {
            await (prisma as any).$transaction([
                // 쿠폰 보상 기록
                (prisma as any).userReward.create({
                    data: { userId, type: "checkin", amount: 3, unit: "coupon" as any },
                }),
                // 물 주기 보상 기록
                (prisma as any).userReward.create({
                    data: { userId, type: "checkin", amount: 2, unit: "water" as any },
                }),
                // 유저 데이터 업데이트 (쿠폰 3 + 물 2)
                (prisma as any).user.update({
                    where: { id: userId },
                    data: {
                        couponCount: { increment: 3 },
                        waterStock: { increment: 2 },
                        totalWaterGiven: { increment: 2 },
                    },
                }),
                // 체크인 보상 완료 표시
                (prisma as any).userCheckin.update({ where: { id: created.id }, data: { rewarded: true } }),
            ]);
            awarded = true;
        }

        return NextResponse.json({
            success: true,
            alreadyChecked: false,
            awarded,
            streak: effectiveStreak,
            weekCount,
            weekStamps,
            rewardAmount: awarded ? 3 : 0,
        });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}
