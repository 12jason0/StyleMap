// src/app/garden/page.tsx

"use client";

import React, { useEffect, useState } from "react";

type Tree = { id: number; completedAt: number };

export default function GardenPage() {
    const [trees, setTrees] = useState<Tree[]>([]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("garden_trees");
            if (raw) setTrees(JSON.parse(raw));
        } catch {}
    }, []);

    // forest 페이지에서 완료 시 여기도 같이 쌓이도록 할 계획
    // 현재는 안내만 표시

    return (
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-[84px]">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🏡</span> 나의 정원
            </h1>
            {trees.length === 0 ? (
                <div className="rounded-2xl border border-green-100 bg-white p-6 text-gray-700">
                    아직 완성된 나무가 없어요. 숲에서 물주기 15회를 완료하고 정원을 채워보세요.
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {trees.map((t) => (
                        <div key={t.id} className="rounded-xl border border-green-100 bg-white p-4 text-center">
                            <div className="mx-auto w-20 h-28 bg-gradient-to-b from-green-200 to-emerald-200 rounded-md" />
                            <div className="mt-2 text-xs text-gray-500">{new Date(t.completedAt).toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
