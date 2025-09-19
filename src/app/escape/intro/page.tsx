"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";

// --- 타입 정의 (기존과 동일) ---
type Story = {
    id: number;
    title: string;
    synopsis: string;
    imageUrl?: string | null;
};
type StoryChapter = {
    id: number;
    story_id: number;
    chapter_number: number;
    title: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    location_name?: string;
};

// --- 로딩 중일 때 표시할 컴포넌트 (기존과 동일) ---
function LoadingSpinner() {
    return (
        <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-[1001]">
            <p className="text-xl text-gray-700 font-serif">이야기를 불러오는 중...</p>
        </div>
    );
}

export default function EscapeIntroPage() {
    const COUNT_PAGES = 32;
    const router = useRouter();
    const search = useSearchParams();
    const storyId = Number(search.get("id"));

    // --- 상태(State) 관리 (기존과 동일) ---
    const [story, setStory] = useState<Story | null>(null);
    const [chapters, setChapters] = useState<StoryChapter[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [animationFinished, setAnimationFinished] = useState<boolean>(false);

    // --- 지도 컴포넌트 동적 로딩 (기존과 동일) ---
    const KakaoMap = useMemo(
        () =>
            dynamic(() => import("@/components/KakaoMap"), {
                ssr: false,
                loading: () => (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        지도 로딩...
                    </div>
                ),
            }),
        []
    );

    // --- Effect Hooks (기존과 동일) ---
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    useEffect(() => {
        if (!Number.isFinite(storyId)) {
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const res = await fetch(`/api/escape/chapters?storyId=${storyId}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    const sorted = [...data]
                        .filter((c: any) => c && typeof c === "object")
                        .sort((a: any, b: any) => (a.chapter_number || 0) - (b.chapter_number || 0));
                    setChapters(sorted);
                }
            } catch (error) {
                console.error("Failed to fetch chapter data:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, [storyId]);

    useEffect(() => {
        const DURATION = 5000;
        const INITIAL = 500;
        const PAGES = COUNT_PAGES;
        const increment = DURATION / (PAGES * 2);
        const lastDelay = (PAGES - 1) * increment;
        const total = DURATION + INITIAL * 2 + lastDelay + 200;
        const t = setTimeout(() => setAnimationFinished(true), total);
        return () => clearTimeout(t);
    }, []);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="fixed inset-0 bg-[aliceblue] flex items-center justify-center pl-[16vw] md:pl-[20vw]">
            <style>
                {`
/* --- 기존 CSS 코드 (동일) --- */
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap");
:root {
  --color-cover: hsl(0, 44%, 42%);
  --color-cover-text: hsl(40, 64%, 80%);
  --duration: 5000ms;
  --initial-delay: 500ms;
}

body { display: flex; height: 100vh; margin: 0; justify-content: center; align-items: center; font-family: "Cormorant Garamond", Garamond, "Times New Roman", Times, serif; font-size: 20px; background-color: aliceblue; }

.book { width: 52vh; height: 78vh; border-radius: 0 24px 24px 0; transform-style: preserve-3d; transform: scale(0.5) rotateX(60deg) rotateZ(30deg); animation: move-book var(--duration) ease-in-out forwards; animation-delay: var(--initial-delay); }

.page { position: absolute; width: 100%; height: 100%; background-color: antiquewhite; background: linear-gradient(to right, rgba(0, 0, 0, 0.1), transparent 10%) antiquewhite; border: 1px solid rgba(0, 0, 0, 0.2); border-radius: inherit; z-index: calc(var(--pages) - var(--id, 0)); transform: translateZ(calc(var(--id, 0) * -1px)); transform-origin: 0 0; animation: turn-page var(--duration) ease-in-out forwards; --increment: calc(var(--duration) / (var(--pages) * 2)); animation-delay: calc(var(--id, 0) * var(--increment) + var(--initial-delay) * 2); }

main.page { animation: none; padding: 32px; box-sizing: border-box; overflow-y: auto; z-index: 1; }

.cover { width: 100%; height: 100%; color: var(--color-cover-text); z-index: var(--pages); padding: 5%; box-sizing: border-box; font-size: clamp(12px, 2.2vh, 36px); }
.cover .cover-content { position: relative; display: grid; justify-items: center; align-items: center; grid-auto-rows: 1fr; height: 90%; width: 90%; box-sizing: border-box; margin: 5%; padding: 5%; border: 12px double var(--color-cover-text); text-align: center; }
.cover h1, .cover h2 { font-weight: 300; }
.cover h1 { text-transform: uppercase; }
.cover img { width: 50%; filter: sepia(100%) brightness(85%) saturate(550%) hue-rotate(-10deg); }

.cover, .back, .spine { background: var(--color-cover); }

.back { transform: translateZ(calc(var(--pages) * -1px)); animation: none; z-index: 0; }

.spine { position: absolute; height: 100%; width: calc(var(--pages) * 1px + 2px); transform-origin: 100% 100%; transform: translateZ(calc(var(--pages) * -1px)) translateX(calc(var(--pages) * -1px)) rotateY(90deg); animation: fold-spine 3s ease-in-out forwards; }

/* ▼ 왼쪽 페이지 내부 컨텐츠를 위한 CSS 추가 ▼ */
.left-page-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    box-sizing: border-box;
    /* 페이지가 180도 뒤집히므로, 내부 컨텐츠를 다시 180도 뒤집어 바로 보이게 합니다. */
    transform: rotateY(180deg);
    backface-visibility: hidden; /* 요소의 뒷면이 보이지 않도록 처리 */
}

@keyframes move-book { from { perspective: 2000px; transform: scale(0.5) rotateX(60deg) rotateZ(30deg); } to { perspective: 5000px; transform: scale(1) rotateX(0deg) rotateZ(0deg); } }

@keyframes fold-spine { from { transform: translateZ(calc(var(--pages) * -1px)) translateX(calc(var(--pages) * -1px)) rotateY(90deg); } to { transform: translateZ(calc(var(--pages) * -1px)) translateX(calc(var(--pages) * -1px)) rotateY(0deg); } }

@keyframes turn-page { from { transform: translateZ(calc(var(--id, 0) * -1px)) rotateY(0); } to { transform: translateZ(calc((var(--pages) - var(--id, 0)) * -1px)) rotateY(-180deg); } }
                `}
            </style>

            {/* ▼ 기존의 .relative div는 제거하고 .book을 최상위로 사용 ▼ */}
            <div className="book" style={{ ["--pages" as any]: String(COUNT_PAGES) } as React.CSSProperties}>
                {/* ▼ 수정: 지도와 버튼을 .book 내부의 첫 페이지로 이동 ▼ */}
                <div className="page" style={{ ["--id" as any]: "0" } as React.CSSProperties}>
                    {animationFinished && (
                        <div className="left-page-content">
                            <button
                                onClick={() => router.back()}
                                className="px-3 py-1.5 text-sm rounded-full bg-white border border-gray-300 shadow"
                            >
                                ← 뒤로가기
                            </button>
                            <div className="mt-3 w-[280px] max-w-[90%] h-[200px] rounded-xl overflow-hidden border border-gray-300 bg-white shadow">
                                <KakaoMap
                                    places={(() => {
                                        const c: any = (chapters || [])[0];
                                        if (!c)
                                            return [
                                                {
                                                    id: 1,
                                                    name: "서울",
                                                    latitude: 37.5665,
                                                    longitude: 126.978,
                                                    address: "서울특별시",
                                                },
                                            ] as any[];
                                        return [
                                            {
                                                id: c.id,
                                                name: c.location_name || c.title || "위치",
                                                latitude: Number(c.latitude ?? 37.5665),
                                                longitude: Number(c.longitude ?? 126.978),
                                                address: c.address,
                                            },
                                        ];
                                    })()}
                                    userLocation={null}
                                    selectedPlace={null}
                                    onPlaceClick={() => {}}
                                    className="w-full h-full"
                                    drawPath={false}
                                    routeMode="simple"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="cover page">
                    <div className="cover-content">
                        <h1>Alice in Wonderland</h1>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="https://thesonofthomp-static-resources.netlify.app/rabbit.png" alt="rabbit" />
                        <h2>by Lewis Carroll</h2>
                    </div>
                </div>

                {Array.from({ length: COUNT_PAGES - 1 }, (_, i) => (
                    <div
                        key={i + 1}
                        className="page"
                        style={{ ["--id" as any]: String(i + 1) } as React.CSSProperties}
                    />
                ))}

                <main className="page" style={{ ["--id" as any]: String(COUNT_PAGES) } as React.CSSProperties}>
                    <h1>CHAPTER I.</h1>
                    <h2>Down the Rabbit-Hole</h2>
                    <p>
                        Alice was beginning to get very tired of sitting by her sister on the bank, and of having
                        nothing to do...
                    </p>
                    <p>
                        So she was considering in her own mind ... when suddenly a White Rabbit with pink eyes ran close
                        by her.
                    </p>
                    <p>
                        In another moment down went Alice after it, never once considering how in the world she was to
                        get out again.
                    </p>
                    <p>The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down...</p>
                </main>

                <div className="back page" />
            </div>
        </div>
    );
}
