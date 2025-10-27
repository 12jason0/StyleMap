// src/app/forest/page.tsx

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function GrowForestPage() {
    const router = useRouter();
    const [level, setLevel] = useState(1); // 시각적 크기 변화용
    const [exp, setExp] = useState(0);
    const [watersCount, setWatersCount] = useState(0);
    const [hasGardenKey, setHasGardenKey] = useState<boolean>(false);
    const REQUIRED_WATERS = 15;
    const [lastWaterAt, setLastWaterAt] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem("authToken");
                const headers: any = token ? { Authorization: `Bearer ${token}` } : {};
                const res = await fetch("/api/forest/tree/current", { headers, cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                const count = Number(data?.waterCount || 0);
                const required = Number(data?.required || REQUIRED_WATERS);
                setWatersCount(count);
                setExp(Math.min(100, Math.round((count / required) * 100)));
            } catch {}
            try {
                const token = localStorage.getItem("authToken");
                const headers: any = token ? { Authorization: `Bearer ${token}` } : {};
                const res = await fetch("/api/garden", { headers, cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                const unlocked = Boolean(data?.garden?.isUnlocked);
                setHasGardenKey(unlocked);
                if (unlocked) router.push("/garden");
            } catch {}
        })();
    }, []);

    const handleWater = async (amount = 1) => {
        try {
            const token = localStorage.getItem("authToken");
            const headers: any = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await fetch("/api/forest/water", {
                method: "POST",
                headers,
                body: JSON.stringify({ source: "admin", amount }),
            });
            const data = await res.json().catch(() => ({}));
            const required = Number(data?.required || REQUIRED_WATERS);
            const count = Number(data?.waterCount || 0);
            setWatersCount(count);
            setExp(Math.min(100, Math.round((count / required) * 100)));
            if (data?.completed) {
                setHasGardenKey(true);
                setLevel((lv) => lv + 1);
                router.push("/garden");
            }
            setLastWaterAt(Date.now());
        } catch {}
    };

    return (
        <div
            className="max-w-3xl mx-auto px-4 pt-4 pb-[84px] h-[calc(100vh-64px)] sm:h-[calc(100vh-88px)] overflow-auto"
            style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}
        >
            <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🌳</span> 나의 작은 숲
            </h1>
            <div className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-gray-800">레벨 {level}</div>
                    <div className="text-gray-500 text-sm">
                        물주기 {watersCount}/{REQUIRED_WATERS}
                    </div>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-green-500" style={{ width: `${exp}%` }} />
                </div>
                <div className="relative w-full h-[34vh] sm:h-[42vh] max-h-[520px] rounded-xl overflow-hidden bg-gradient-to-b from-green-50 to-emerald-100 flex items-end justify-center mx-auto">
                    <div
                        className="transition-all duration-500"
                        style={{
                            width: `${80 + level * 6}px`,
                            height: `${80 + level * 10}px`,
                            background: "linear-gradient(180deg, #99c08e, #7aa06f)",
                            clipPath:
                                "polygon(50% 0%, 60% 20%, 70% 35%, 80% 55%, 85% 75%, 50% 100%, 15% 75%, 20% 55%, 30% 35%, 40% 20%)",
                        }}
                    />
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <button
                        onClick={() => handleWater(1)}
                        className="px-4 py-2 rounded-lg text-white text-sm sm:text-base font-semibold bg-green-600 hover:bg-green-700"
                    >
                        물 주기
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleWater(10)}
                            className="px-3 py-2 rounded-lg border border-green-300 text-green-700 text-sm hover:bg-green-50"
                        >
                            물 10개 받기
                        </button>
                        {hasGardenKey && (
                            <button
                                onClick={() => router.push("/garden")}
                                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                            >
                                🏡 나의 정원으로 가기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
