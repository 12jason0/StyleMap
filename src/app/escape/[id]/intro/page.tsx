"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EscapeIntroPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const storyId = Number(params?.id);
    const [ready, setReady] = useState(false);
    const [opened, setOpened] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setReady(true), 150);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!opened) return;
        const t = setTimeout(() => {
            if (Number.isFinite(storyId)) router.replace(`/escape/${storyId}`);
        }, 1600);
        return () => clearTimeout(t);
    }, [opened, router, storyId]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="mb-6">
                    <div className="text-xs text-amber-700/80 font-semibold tracking-widest">ESCAPE MISSION</div>
                    <h1 className="text-2xl font-extrabold text-amber-900 mt-2">시작 준비 완료</h1>
                    <p className="text-sm text-amber-800 mt-1">책을 펼쳐 여정을 시작하세요</p>
                </div>

                <div className="relative mx-auto w-[280px] h-[200px] perspective-[1200px] select-none">
                    <style>
                        {`
                        @keyframes bookOpen {
                          0% { transform: rotateY(0deg); }
                          100% { transform: rotateY(-150deg); }
                        }
                        @keyframes fadeIn {
                          from { opacity: 0; transform: translateY(6px) }
                          to { opacity: 1; transform: translateY(0) }
                        }
                        .scene { perspective: 1200px; }
                        .book { transform-style: preserve-3d; }
                        .page { backface-visibility: hidden; }
                        `}
                    </style>
                    <div className="absolute inset-0 rounded-xl shadow-2xl">
                        <div className="scene w-full h-full">
                            <div className="book relative w-full h-full">
                                {/* 뒷표지 */}
                                <div className="absolute inset-0 bg-amber-900 rounded-xl" />

                                {/* 책 페이지 스택 */}
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute inset-2 bg-amber-50 rounded-lg border border-amber-200 page"
                                        style={{ transform: `translateZ(${i * 2}px)` }}
                                    />
                                ))}

                                {/* 앞표지 */}
                                <div
                                    className={`absolute inset-0 rounded-xl bg-gradient-to-br from-amber-800 to-yellow-700 border border-amber-900/40 page ${
                                        ready && opened ? "[animation:bookOpen_1.2s_ease_forwards]" : ""
                                    }`}
                                    style={{ transformOrigin: "left center" }}
                                >
                                    <div className="absolute inset-0 grid place-items-center">
                                        <div className="text-center">
                                            <div className="text-xs text-amber-200/90 tracking-wider">OPEN</div>
                                            <div className="text-white font-extrabold text-lg mt-1">ESCAPE</div>
                                            <div className="text-[10px] text-amber-200/80 mt-1">TAP TO OPEN</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 중앙 책등 강조 */}
                                <div className="absolute left-0 top-0 h-full w-1 bg-amber-950/60 rounded-l-xl" />
                            </div>
                        </div>
                    </div>

                    {/* 안내 텍스트 */}
                    <div
                        className={`mt-6 text-amber-900/90 text-sm ${
                            ready ? "animate-[fadeIn_.5s_ease_forwards]" : "opacity-0"
                        }`}
                    >
                        표지를 탭하면 책이 펼쳐지고 자동으로 시작합니다
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="mt-5 flex items-center justify-center gap-3">
                        <button
                            onClick={() => setOpened(true)}
                            className="px-5 py-2 rounded-full bg-amber-700 text-white text-sm font-semibold shadow hover:bg-amber-800 active:scale-95"
                        >
                            책 펼치기
                        </button>
                        {Number.isFinite(storyId) && (
                            <button
                                onClick={() => router.replace(`/escape/${storyId}`)}
                                className="px-5 py-2 rounded-full border border-amber-800 text-amber-900 text-sm font-semibold bg-white hover:bg-amber-50 active:scale-95"
                            >
                                바로 시작
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
