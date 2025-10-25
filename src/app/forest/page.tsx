// src/app/forest/page.tsx

"use client";

import React, { useEffect, useRef, useState } from "react";

export default function GrowForestPage() {
    const [level, setLevel] = useState(1); // 유지: 시각적 크기 변화용 (선택)
    const [exp, setExp] = useState(0); // 유지: 막대 표현 재사용
    const [water, setWater] = useState(3);
    const [watersCount, setWatersCount] = useState(0); // 누적 물주기 횟수
    const [completedTrees, setCompletedTrees] = useState<number>(0);
    const [hasGardenKey, setHasGardenKey] = useState<boolean>(false);
    const REQUIRED_WATERS = 15;
    const [lastWaterAt, setLastWaterAt] = useState<number | null>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("forest_state");
            if (raw) {
                const s = JSON.parse(raw);
                setLevel(s.level ?? 1);
                setExp(s.exp ?? 0);
                setWater(s.water ?? 3);
                setLastWaterAt(s.lastWaterAt ?? null);
                setWatersCount(s.watersCount ?? 0);
                setCompletedTrees(s.completedTrees ?? 0);
                setHasGardenKey(s.hasGardenKey ?? false);
            }
        } catch {}
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(
                "forest_state",
                JSON.stringify({ level, exp, water, lastWaterAt, watersCount, completedTrees, hasGardenKey })
            );
        } catch {}
    }, [level, exp, water, lastWaterAt, watersCount, completedTrees, hasGardenKey]);

    const handleWater = () => {
        if (water <= 0) return;
        setWater((w) => w - 1);
        setWatersCount((n) => {
            const next = n + 1;
            // 진행도 바 - 15회를 100% 기준으로 환산
            setExp(Math.min(100, Math.round((next / REQUIRED_WATERS) * 100)));
            if (next >= REQUIRED_WATERS) {
                // 나무 완성 처리
                setCompletedTrees((c) => c + 1);
                setHasGardenKey(true);
                try {
                    const raw = localStorage.getItem("garden_trees");
                    const list: any[] = raw ? JSON.parse(raw) : [];
                    const id = Date.now();
                    list.push({ id, completedAt: Date.now() });
                    localStorage.setItem("garden_trees", JSON.stringify(list));
                } catch {}
                // 다음 나무를 위한 초기화
                setWatersCount(0);
                setExp(0);
                setLevel((lv) => lv + 1); // 크기 업그레이드 유지(선택)
            }
            return next >= REQUIRED_WATERS ? 0 : next;
        });
        setLastWaterAt(Date.now());
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
                        onClick={handleWater}
                        disabled={water <= 0}
                        className={`px-4 py-2 rounded-lg text-white text-sm sm:text-base font-semibold ${
                            water > 0 ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"
                        }`}
                    >
                        물 주기 ({water}회)
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setWater((w) => w + 10)}
                            className="px-3 py-2 rounded-lg border border-green-300 text-green-700 text-sm hover:bg-green-50"
                        >
                            물 10개 받기
                        </button>
                        {hasGardenKey && (
                            <a
                                href="/garden"
                                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm"
                            >
                                정원 열기
                            </a>
                        )}
                        {lastWaterAt ? (
                            <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                마지막 물주기 {new Date(lastWaterAt).toLocaleTimeString()}
                            </div>
                        ) : (
                            <div className="text-xs sm:text-sm text-gray-400">아직 기록 없음</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
