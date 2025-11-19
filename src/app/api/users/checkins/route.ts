import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // UTC+9

function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

// KST(UTC+9) 기준 자정
function startOfDayKST(date: Date): Date {
    const ms = date.getTime() + KST_OFFSET_MS; // KST로 보정
    const kst = new Date(ms);
    const y = kst.getUTCFullYear();
    const m = kst.getUTCMonth();
    const d = kst.getUTCDate();
    // 해당 KST 날짜의 00:00을 UTC 기준 밀리초로 만든 뒤 다시 UTC-9h로 되돌려 실제 Date 생성
    const startUtcMs = Date.UTC(y, m, d);
    return new Date(startUtcMs - KST_OFFSET_MS);
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameDayKST(a: Date, b: Date): boolean {
    return startOfDayKST(a).getTime() === startOfDayKST(b).getTime();
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
    let expected = startOfDayKST(now);
    for (const c of sortedDescCheckins) {
        const day = startOfDayKST(new Date(c.date));
        if (isSameDayKST(day, expected)) {
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
    if (isSameDayKST(startOfDayKST(new Date(lastRewarded.date)), startOfDayKST(now))) {
        return 7;
    }
    // 보상 발생일 이후부터 다시 1부터 연속 계산
    const cutoff = startOfDayKST(new Date(lastRewarded.date));
    const filtered = sortedDescCheckins.filter((c) => startOfDayKST(new Date(c.date)) > cutoff);
    return computeConsecutiveStreak(filtered, now);
}

// 보상일 기반 7칸 사이클 도장 배열 생성
function buildCycleStamps(
    sortedDescCheckins: { date: Date; rewarded?: boolean }[],
    now: Date
): { stamps: boolean[]; todayIndex: number | null } {
    const todayStart = startOfDayKST(now);
    const lastRewarded = sortedDescCheckins.find((c) => c.rewarded === true);

    let cycleStart = new Date(todayStart);
    // 보상 당일: 7칸 모두 채워서 보여주기 위해 오늘-6일부터 표시
    if (lastRewarded && isSameDayKST(startOfDayKST(new Date(lastRewarded.date)), todayStart)) {
        cycleStart.setDate(cycleStart.getDate() - 6);
    } else if (lastRewarded) {
        // 보상 다음날부터 1칸부터 시작
        const rewardedDay = startOfDayKST(new Date(lastRewarded.date));
        cycleStart = new Date(rewardedDay);
        cycleStart.setDate(cycleStart.getDate() + 1);
    } else {
        // 보상 이력 없으면 현재 유효 스트릭 길이에 맞춰 시작점 계산
        const effective = computeConsecutiveStreak(sortedDescCheckins, now);
        cycleStart.setDate(cycleStart.getDate() - Math.max(0, effective - 1));
    }

    const dayKey = (d: Date) => {
        const sd = startOfDayKST(d);
        // 월은 0-기반이므로 +1, 두 자리 패딩
        const y = sd.getUTCFullYear();
        const m = String(sd.getUTCMonth() + 1).padStart(2, "0");
        const day = String(sd.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };
    const checkedDaySet = new Set(sortedDescCheckins.map((c) => dayKey(new Date(c.date))));
    const todayKey = dayKey(todayStart);

    let todayIndex: number | null = null;
    const stamps = Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(cycleStart);
        dt.setDate(cycleStart.getDate() + i);
        const dtKey = dayKey(dt);
        if (dtKey === todayKey) {
            todayIndex = i;
        }
        return checkedDaySet.has(dtKey);
    });

    return { stamps, todayIndex };
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
        // 오늘 출석 여부 및 오늘 제외한 과거 도장 배열 생성
        const todayStart = startOfDayKST(new Date(now));
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const todayChecked = checkins.some((c: { date: Date }) => {
            const d = new Date(c.date);
            return d >= todayStart && d < todayEnd;
        });

        // 오늘 제외한 과거 출석만으로 유효 스트릭 계산
        const checkinsExcludingToday = checkins.filter((c: { date: Date }) => new Date(c.date) < todayStart);
        // "오늘 제외" 연속 스트릭은 기준 시점을 어제로 두어 계산
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const streak = computeEffectiveStreak(checkinsExcludingToday, yesterday);

        // 실제 출석 날짜를 기반으로 올바른 배열 생성
        const { stamps: weekStamps, todayIndex } = buildCycleStamps(checkins, now);
        // 오늘 미체크 상태에서 "오늘 제외 연속 출석"이 존재하면 오늘 칸을 미리 표시(프리마킹)
        if (!todayChecked && typeof todayIndex === "number" && todayIndex >= 0) {
            if (streak > 0 && !weekStamps[todayIndex]) {
                weekStamps[todayIndex] = true;
            }
        }
        const weekCount = Math.min(7, Math.max(0, streak));

        return NextResponse.json({ success: true, checkins, streak, todayChecked, weekCount, weekStamps, todayIndex });
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
        const start = startOfDayKST(now);
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
            const { stamps: weekStamps, todayIndex } = buildCycleStamps(recent, now);
            const weekCount = Math.min(7, Math.max(0, streak));
            return NextResponse.json({
                success: true,
                alreadyChecked: true,
                awarded: existing.rewarded,
                streak,
                weekStamps,
                weekCount,
                todayIndex,
            });
        }

        const created = await (prisma as any).userCheckin.create({ data: { userId, date: now, rewarded: false } });

        // 연속 출석 스트릭 및 사이클 카운트 계산 (오늘 방금 체크 포함)
        const recent = await (prisma as any).userCheckin.findMany({
            where: { userId },
            orderBy: { date: "desc" },
            take: 120,
        });
        const effectiveStreak = computeEffectiveStreak(recent, now);
        // 실제 출석 날짜를 기반으로 올바른 배열 생성 (오늘 포함)
        const { stamps: weekStamps, todayIndex } = buildCycleStamps(recent, now);
        const weekCount = Math.min(7, Math.max(0, effectiveStreak));
        const todayStart = startOfDayKST(now);
        const hasRewardedToday = recent.some(
            (c: { date: Date; rewarded?: boolean }) => c.rewarded === true && isSameDayKST(new Date(c.date), todayStart)
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
            todayIndex,
            rewardAmount: awarded ? 3 : 0,
        });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}
