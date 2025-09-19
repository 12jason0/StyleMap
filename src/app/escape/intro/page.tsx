"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";

// --- 타입 정의 ---
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
    story_text?: string;
    mission_type?: string;
    mission_payload?: any;
};

// --- 로딩 컴포넌트 ---
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

    // --- 상태 관리 ---
    const [story, setStory] = useState<Story | null>(null);
    const [chapters, setChapters] = useState<StoryChapter[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [animationFinished, setAnimationFinished] = useState<boolean>(false);
    const [isClosing, setIsClosing] = useState<boolean>(false);
    const [currentChapterIdx, setCurrentChapterIdx] = useState<number>(0); // 0부터 시작

    // --- 지도 컴포넌트 동적 로딩 ---
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

    // --- Effect Hooks ---
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
                const [storyRes, chaptersRes] = await Promise.all([
                    fetch(`/api/escape/stories?storyId=${storyId}`),
                    fetch(`/api/escape/chapters?storyId=${storyId}`),
                ]);

                const storyData = await storyRes.json();
                const chaptersData = await chaptersRes.json();

                if (storyData && !storyData.error) setStory(storyData);

                if (Array.isArray(chaptersData)) {
                    const sorted = chaptersData
                        .filter((c: any) => c && typeof c === "object")
                        .sort((a: any, b: any) => (a.chapter_number || 0) - (b.chapter_number || 0));
                    setChapters(sorted);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, [storyId]);

    // 애니메이션 타이밍 설정
    useEffect(() => {
        const DURATION = 5000;
        const INITIAL = 500;
        const PAGES = COUNT_PAGES;
        const increment = DURATION / (PAGES * 2);
        const lastDelay = (PAGES - 1) * increment;
        const total = DURATION + INITIAL * 2 + lastDelay + 200;

        const timer = setTimeout(() => setAnimationFinished(true), total);
        return () => clearTimeout(timer);
    }, []);

    // 현재 챕터 데이터 준비
    const currentChapter = chapters[currentChapterIdx];
    const currentPlace = currentChapter
        ? [
              {
                  id: currentChapter.id,
                  name: currentChapter.location_name || currentChapter.title || "위치",
                  latitude: Number(currentChapter.latitude ?? 37.5665),
                  longitude: Number(currentChapter.longitude ?? 126.978),
                  address: currentChapter.address,
              },
          ]
        : [{ id: 1, name: "서울", latitude: 37.5665, longitude: 126.978, address: "서울특별시" }];

    const numFlipPages = Math.max(1, Math.min(COUNT_PAGES - 2, chapters.length));

    const handleCloseBook = () => {
        setIsClosing(true);
        setTimeout(() => {
            router.push("/"); // 메인 페이지로 이동
        }, 1300);
    };

    const goToNextChapter = () => {
        if (currentChapterIdx < chapters.length - 1) {
            setCurrentChapterIdx((prev) => prev + 1);
        }
    };

    const goToPrevChapter = () => {
        if (currentChapterIdx > 0) {
            setCurrentChapterIdx((prev) => prev - 1);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="fixed inset-0 bg-[aliceblue] flex items-center justify-center">
            <style>
                {`
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap");

:root {
  --color-cover: hsl(0, 44%, 42%);
  --color-cover-text: hsl(40, 64%, 80%);
  --duration: 5000ms;
  --initial-delay: 500ms;
}

body { 
    display: flex; 
    height: 100vh; 
    margin: 0; 
    justify-content: center; 
    align-items: center; 
    font-family: "Cormorant Garamond", Garamond, "Times New Roman", Times, serif; 
    font-size: 20px; 
    background-color: aliceblue; 
}

.book { 
    width: 52vh; 
    height: 78vh; 
    border-radius: 0 24px 24px 0; 
    transform-style: preserve-3d; 
    transform: scale(0.5) rotateX(60deg) rotateZ(30deg); 
    animation: move-book var(--duration) ease-in-out forwards; 
    animation-delay: var(--initial-delay); 
}

.book.closing { 
    animation: close-book 1.2s ease-in-out forwards; 
}

.page { 
    position: absolute; 
    width: 100%; 
    height: 100%; 
    background-color: antiquewhite; 
    background: linear-gradient(to right, rgba(0, 0, 0, 0.1), transparent 10%) antiquewhite; 
    border: 1px solid rgba(0, 0, 0, 0.2); 
    border-radius: inherit; 
    z-index: calc(var(--pages) - var(--id, 0)); 
    transform: translateZ(calc(var(--id, 0) * -1px)); 
    transform-origin: 0 0; 
    animation: turn-page var(--duration) ease-in-out forwards; 
    --increment: calc(var(--duration) / (var(--pages) * 2)); 
    animation-delay: calc(var(--id, 0) * var(--increment) + var(--initial-delay) * 2); 
}

.page.static { 
    animation: none !important; 
}

.cover { 
    width: 100%; 
    height: 100%; 
    color: var(--color-cover-text); 
    z-index: var(--pages); 
    padding: 5%; 
    box-sizing: border-box; 
    font-size: clamp(12px, 2.2vh, 36px); 
    background: var(--color-cover);
}

.cover .cover-content { 
    position: relative; 
    display: grid; 
    justify-items: center; 
    align-items: center; 
    grid-auto-rows: 1fr; 
    height: 90%; 
    width: 90%; 
    box-sizing: border-box; 
    margin: 5%; 
    padding: 5%; 
    border: 12px double var(--color-cover-text); 
    text-align: center; 
}

.cover h1, .cover h2 { 
    font-weight: 300; 
}

.cover h1 { 
    text-transform: uppercase; 
}

.cover img { 
    width: 50%; 
    filter: sepia(100%) brightness(85%) saturate(550%) hue-rotate(-10deg); 
}

.back { 
    background: var(--color-cover);
    transform: translateZ(calc(var(--pages) * -1px)); 
    animation: none; 
    z-index: 0; 
}

@keyframes move-book { 
    from { 
        perspective: 2000px; 
        transform: scale(0.5) rotateX(60deg) rotateZ(30deg); 
    } 
    to { 
        perspective: 5000px; 
        transform: scale(1) rotateX(0deg) rotateZ(0deg); 
    } 
}

@keyframes turn-page { 
    from { 
        transform: translateZ(calc(var(--id, 0) * -1px)) rotateY(0); 
    } 
    to { 
        transform: translateZ(calc((var(--pages) - var(--id, 0)) * -1px)) rotateY(-180deg); 
    } 
}

@keyframes close-book { 
    from { 
        perspective: 5000px; 
        transform: scale(1) rotateX(0deg) rotateZ(0deg); 
    } 
    to { 
        perspective: 2000px; 
        transform: scale(0.5) rotateX(60deg) rotateZ(30deg); 
    } 
}
                `}
            </style>

            <div className="relative">
                <div
                    className={`book${isClosing ? " closing" : ""}`}
                    style={{ ["--pages" as any]: String(COUNT_PAGES) } as React.CSSProperties}
                >
                    {/* 표지 */}
                    <div className="cover page">
                        <div className="cover-content">
                            <h1>{story?.title || "Alice in Wonderland"}</h1>
                            <img
                                src={story?.imageUrl || "https://thesonofthomp-static-resources.netlify.app/rabbit.png"}
                                alt="cover"
                            />
                            <h2>{story?.synopsis || "An adventure awaits"}</h2>
                        </div>
                    </div>

                    {/* 왼쪽 실제 페이지: 지도(홀수 페이지 컨셉) */}
                    <div
                        className="page"
                        style={
                            {
                                ["--id" as any]: String(COUNT_PAGES - 2),
                                background: "white",
                                animation: "none !important",
                                zIndex: 8,
                            } as React.CSSProperties
                        }
                    >
                        {animationFinished && currentChapter && (
                            <div className="w-full h-full p-6 flex flex-col" style={{ transform: "rotateY(180deg)" }}>
                                <h2 className="text-xl font-bold mb-4 text-center text-gray-900 border-b-2 pb-3">
                                    지도
                                </h2>
                                <div className="flex-1 rounded-lg overflow-hidden border-2 border-gray-300 shadow-md">
                                    <KakaoMap
                                        places={currentPlace as any}
                                        userLocation={null}
                                        selectedPlace={null}
                                        onPlaceClick={() => {}}
                                        className="w-full h-full"
                                        drawPath={false}
                                        routeMode="simple"
                                    />
                                </div>

                                {/* 이전 버튼 */}
                                {currentChapterIdx > 0 && (
                                    <button
                                        onClick={goToPrevChapter}
                                        className="mt-4 self-start px-4 py-2 text-base rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow font-medium"
                                    >
                                        ← 이전 챕터
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 오른쪽 실제 페이지: 텍스트(짝수 페이지 컨셉) */}
                    <div
                        className="page"
                        style={
                            {
                                ["--id" as any]: String(COUNT_PAGES - 1),
                                background: "white",
                                animation: "none !important",
                                zIndex: 7,
                            } as React.CSSProperties
                        }
                    >
                        {animationFinished && currentChapter && (
                            <div className="w-full h-full p-6 flex flex-col">
                                <h2 className="text-xl font-bold mb-4 text-center text-gray-900 border-b-2 pb-3">
                                    Chapter {currentChapter.chapter_number}. {currentChapter.title || "스토리"}
                                </h2>

                                {/* 텍스트 영역 */}
                                <div className="flex-1 bg-white rounded border p-4 overflow-auto">
                                    <h3 className="text-lg font-bold mb-2">스토리</h3>
                                    <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
                                        {currentChapter.story_text || "이야기 내용이 없습니다."}
                                    </div>
                                    <h3 className="text-lg font-bold mt-4 mb-2">미션</h3>
                                    <pre className="whitespace-pre-wrap text-sm">
                                        {JSON.stringify(currentChapter.mission_payload ?? {}, null, 2)}
                                    </pre>
                                </div>

                                {/* 네비게이션 버튼 */}
                                <div className="mt-4 flex justify-end">
                                    {currentChapterIdx < chapters.length - 1 ? (
                                        <button
                                            onClick={goToNextChapter}
                                            className="px-4 py-2 text-base rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors shadow font-medium"
                                        >
                                            다음 챕터 →
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleCloseBook}
                                            className="px-4 py-2 text-base rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow font-medium"
                                        >
                                            책 덮고 종료
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 애니메이션용 중간 페이지들 */}
                    {Array.from({ length: COUNT_PAGES - 4 }, (_, i) => {
                        // 가운데에서부터 오른쪽으로 넘기는 느낌을 주기 위해
                        // 중간 인덱스부터 애니메이션 되도록 순서를 재배치
                        const middleStart = Math.floor((COUNT_PAGES - 4) / 2);
                        const id = ((i + middleStart) % (COUNT_PAGES - 4)) + 1;
                        const isAnimated = i < numFlipPages;
                        return (
                            <div
                                key={`mid-${id}`}
                                className={isAnimated ? "page" : "page static"}
                                style={{ ["--id" as any]: String(id) } as React.CSSProperties}
                            />
                        );
                    })}

                    {/* 뒷표지 */}
                    <div className="back page" />
                </div>

                {/* 하단 페이지 인디케이터 */}
                {animationFinished && chapters.length > 0 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1201] pointer-events-auto">
                        <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium">
                            {currentChapterIdx + 1} / {chapters.length}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
