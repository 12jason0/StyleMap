"use client";

import React, { useEffect, useMemo, useState } from "react";

type Badge = {
    id: number;
    name: string;
    description: string;
    image_url?: string;
};

type Story = {
    id: number;
    title: string;
    synopsis: string;
    region?: string;
    estimated_duration_min?: number;
    price?: string;
    reward_badge_id?: number | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
};

type StoryChapter = {
    id: number;
    story_id: number;
    chapter_number: number;
    title: string;
    location_name?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    story_text?: string;
    mission_type?: "quiz" | "photo" | "location" | "none";
    mission_payload?: any;
    puzzle_text?: string;
};

type UserStoryProgress = {
    story_id: number;
    current_chapter: number; // chapter_number
    status: "not_started" | "in_progress" | "completed";
    started_at?: number | null;
    completed_at?: number | null;
};

// 서버 데이터는 컴포넌트 내부에서 관리합니다

// LocalStorage helpers
const STORAGE_KEY = "escape_progress_v1";
type ProgressMap = Record<string, UserStoryProgress>; // key: story_id

function readProgress(): ProgressMap {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as ProgressMap) : {};
    } catch {
        return {};
    }
}

function writeProgress(map: ProgressMap) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
}

export default function EscapePage() {
    const [stories, setStories] = useState<Story[]>([]);
    const [chapters, setChapters] = useState<StoryChapter[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
    const [progressMap, setProgressMap] = useState<ProgressMap>({});
    const [answer, setAnswer] = useState<string>("");
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        setProgressMap(readProgress());
        (async () => {
            try {
                const sRes = await fetch("/api/escape/stories");
                const sRaw = await sRes.json();
                const sData: any[] = Array.isArray(sRaw)
                    ? sRaw
                    : Array.isArray((sRaw as any)?.stories)
                    ? (sRaw as any).stories
                    : [];
                setStories(sData);
                const badgeMap: Record<number, Badge> = {};
                sData.forEach((s: any) => {
                    if (s.badge) badgeMap[s.badge.id] = s.badge;
                });
                setBadges(Object.values(badgeMap));
            } catch (e) {
                console.error("Failed to load stories", e);
            }
        })();
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1400);
        return () => clearTimeout(t);
    }, [toast]);

    const selectedStory = useMemo(() => {
        if (!Array.isArray(stories)) return null;
        return stories.find((s) => s.id === selectedStoryId) || null;
    }, [stories, selectedStoryId]);
    const selectedChapters = useMemo(
        () =>
            chapters.filter((c) => c.story_id === selectedStoryId).sort((a, b) => a.chapter_number - b.chapter_number),
        [chapters, selectedStoryId]
    );

    const storyProgress = useMemo<UserStoryProgress | null>(() => {
        if (!selectedStoryId) return null;
        return progressMap[String(selectedStoryId)] || null;
    }, [progressMap, selectedStoryId]);

    const currentChapter = useMemo(() => {
        if (!selectedChapters.length) return null;
        const currentNo = storyProgress?.current_chapter ?? 1;
        return selectedChapters.find((c) => c.chapter_number === currentNo) || selectedChapters[0];
    }, [selectedChapters, storyProgress]);

    const handleStartStory = async (storyId: number) => {
        const now = Date.now();
        const next: ProgressMap = {
            ...progressMap,
            [String(storyId)]: { story_id: storyId, current_chapter: 1, status: "in_progress", started_at: now },
        };
        setProgressMap(next);
        writeProgress(next);
        setSelectedStoryId(storyId);
        setToast("미션 시작!");
        try {
            const res = await fetch(`/api/escape/chapters?storyId=${storyId}`);
            const data = await res.json();
            setChapters((prev) => {
                const others = prev.filter((c) => c.story_id !== storyId);
                return [...others, ...(Array.isArray(data) ? data : [])];
            });
        } catch (e) {
            console.error("Failed to load chapters", e);
        }
    };

    const handleSubmitMission = () => {
        if (!selectedStory || !currentChapter) return;
        const p = progressMap[String(selectedStory.id)];

        // 간단한 검증 (quiz만 정답 확인)
        if (currentChapter.mission_type === "quiz") {
            const correct = String(currentChapter.mission_payload?.answer ?? "")
                .trim()
                .toLowerCase();
            if (correct && correct !== answer.trim().toLowerCase()) {
                setToast("정답이 아니에요");
                return;
            }
        }

        // 다음 챕터로 이동 또는 스토리 완료
        const chapterIdx = selectedChapters.findIndex((c) => c.chapter_number === currentChapter.chapter_number);
        const isLast = chapterIdx === selectedChapters.length - 1;
        const now = Date.now();

        const nextProgress: UserStoryProgress = isLast
            ? {
                  story_id: selectedStory.id,
                  current_chapter: currentChapter.chapter_number,
                  status: "completed",
                  started_at: p?.started_at ?? now,
                  completed_at: now,
              }
            : {
                  story_id: selectedStory.id,
                  current_chapter: currentChapter.chapter_number + 1,
                  status: "in_progress",
                  started_at: p?.started_at ?? now,
                  completed_at: null,
              };

        const nextMap = { ...progressMap, [String(selectedStory.id)]: nextProgress };
        setProgressMap(nextMap);
        writeProgress(nextMap);
        fetch("/api/escape/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nextProgress),
        }).catch(() => {});
        setAnswer("");
        setToast(isLast ? "스토리 완료!" : "다음 미션으로 이동");
    };

    const earnedBadge = useMemo(() => {
        if (!selectedStory) return null;
        const pr = progressMap[String(selectedStory.id)];
        if (pr?.status === "completed" && selectedStory.reward_badge_id) {
            return badges.find((b) => b.id === selectedStory.reward_badge_id) || null;
        }
        return null;
    }, [badges, progressMap, selectedStory]);

    return (
        <div className="min-h-screen bg-white text-black">
            <section className="max-w-7xl mx-auto px-4 pt-24 pb-12">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Escape 미션</h1>
                    <p className="text-gray-600 mt-1">도심을 누비며 챕터를 완료하고 배지를 획득하세요!</p>
                </div>

                {/* 스토리 목록 */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {stories.map((s) => {
                        const pr = progressMap[String(s.id)];
                        const done = pr?.status === "completed";
                        const badge = s.reward_badge_id ? badges.find((b) => b.id === s.reward_badge_id) : null;
                        return (
                            <div key={s.id} className="border rounded-2xl p-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-semibold text-gray-900">{s.title}</h3>
                                    {done && <span className="text-xs text-green-600">완료</span>}
                                </div>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{s.synopsis}</p>
                                <div className="text-xs text-gray-500 flex gap-3 mb-3">
                                    {s.region && <span>📍 {s.region}</span>}
                                    {s.estimated_duration_min && <span>⏱ {s.estimated_duration_min}분</span>}
                                    {s.price && <span>💰 {s.price}</span>}
                                </div>
                                {badge && <div className="text-xs text-gray-600 mb-3">🏅 보상 배지: {badge.name}</div>}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedStoryId(s.id)}
                                        className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100 hover:cursor-pointer"
                                    >
                                        자세히 보기
                                    </button>
                                    {!pr ? (
                                        <button
                                            onClick={() => handleStartStory(s.id)}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                        >
                                            시작하기
                                        </button>
                                    ) : pr.status === "completed" ? (
                                        <button
                                            onClick={() => setSelectedStoryId(s.id)}
                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                                        >
                                            다시 보기
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedStoryId(s.id)}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                        >
                                            이어하기
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 상세/미션 진행 */}
                {selectedStory && (
                    <div className="border rounded-2xl p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">{selectedStory.title}</h2>
                                <p className="text-sm text-gray-600 mt-1">{selectedStory.synopsis}</p>
                            </div>
                            <button
                                onClick={() => setSelectedStoryId(null)}
                                className="text-sm text-gray-500 hover:text-gray-700 border px-3 py-1.5 rounded-lg hover:cursor-pointer"
                            >
                                닫기
                            </button>
                        </div>

                        {/* 진행도 바 */}
                        <div className="mb-4">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500"
                                    style={{
                                        width: `${Math.round(
                                            (100 *
                                                (storyProgress?.status === "completed"
                                                    ? selectedChapters.length
                                                    : (storyProgress?.current_chapter ?? 1) - 1)) /
                                                Math.max(1, selectedChapters.length)
                                        )}%`,
                                    }}
                                />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {storyProgress?.status === "completed"
                                    ? `완료 (${selectedChapters.length}/${selectedChapters.length})`
                                    : `진행 ${Math.max(0, (storyProgress?.current_chapter ?? 1) - 1)}/${
                                          selectedChapters.length
                                      }`}
                            </div>
                        </div>

                        {currentChapter && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold">
                                        Chapter {currentChapter.chapter_number}. {currentChapter.title}
                                    </h3>
                                    <span className="text-xs text-gray-500">총 {selectedChapters.length}장</span>
                                </div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                                    {currentChapter.story_text || "미션 설명이 제공되지 않았습니다."}
                                </div>
                                {/* 미션 UI */}
                                {currentChapter.mission_type === "quiz" && (
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            placeholder={currentChapter.mission_payload?.question || "정답 입력"}
                                            className="border rounded-lg px-3 py-2 text-sm w-full"
                                        />
                                        <button
                                            onClick={handleSubmitMission}
                                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                        >
                                            제출
                                        </button>
                                    </div>
                                )}
                                {currentChapter.mission_type === "location" && (
                                    <div className="text-sm text-gray-600 mb-3">
                                        힌트: {currentChapter.mission_payload?.hint || "주변을 살펴보세요."}
                                    </div>
                                )}
                                {currentChapter.mission_type === "photo" && (
                                    <div className="text-sm text-gray-600 mb-3">
                                        미션: {currentChapter.mission_payload?.tip || "사진을 촬영해 인증해보세요."}
                                    </div>
                                )}

                                {storyProgress?.status !== "completed" && currentChapter.mission_type !== "quiz" && (
                                    <button
                                        onClick={handleSubmitMission}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                    >
                                        완료 처리
                                    </button>
                                )}

                                {storyProgress?.status === "completed" && earnedBadge && (
                                    <div className="mt-4 flex items-center gap-3 p-3 border rounded-lg bg-white">
                                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                            🏅
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold">배지 획득: {earnedBadge.name}</div>
                                            <div className="text-xs text-gray-600">{earnedBadge.description}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-lg shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}
