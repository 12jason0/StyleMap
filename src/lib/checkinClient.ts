"use client";

// 공용 출석체크 클라이언트 유틸

export type WeekStampsResult = {
    stamps: boolean[];
    todayChecked: boolean;
};

export async function fetchWeekStamps(): Promise<WeekStampsResult | null> {
    try {
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch("/api/users/checkins", {
            cache: "no-store",
            credentials: "include",
            headers,
        });
        if (!res.ok) return null;
        const data = await res.json();
        // 서버에서 보낸 weekStamps를 그대로 사용
        const stamps: boolean[] = Array.isArray(data?.weekStamps)
            ? (data.weekStamps as boolean[])
            : new Array(7).fill(false);
        const todayChecked = Boolean(data?.todayChecked);
        return { stamps, todayChecked };
    } catch {
        return null;
    }
}

export async function postCheckin(): Promise<{
    ok: boolean;
    awarded: boolean;
    rewardAmount: number;
    success: boolean;
    alreadyChecked: boolean;
    weekStamps?: boolean[];
    weekCount?: number;
}> {
    try {
        const token = localStorage.getItem("authToken");
        const res = await fetch("/api/users/checkins", {
            method: "POST",
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json().catch(() => ({}));
        return {
            ok: res.ok,
            awarded: Boolean(data?.awarded),
            rewardAmount: Number(data?.rewardAmount || 0),
            success: Boolean(data?.success ?? res.ok),
            alreadyChecked: Boolean(data?.alreadyChecked),
            weekStamps: Array.isArray(data?.weekStamps) ? (data.weekStamps as boolean[]) : undefined,
            weekCount: Number.isFinite(Number(data?.weekCount)) ? Number(data.weekCount) : undefined,
        };
    } catch {
        return { ok: false, awarded: false, rewardAmount: 0, success: false, alreadyChecked: false };
    }
}

export function getLocalTodayKey(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
