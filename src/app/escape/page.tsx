"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
    imageUrl?: string | null;
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

export default function escapePage() {
    const router = useRouter();
    const [stories, setStories] = useState<Story[]>([]);
    const [chapters, setChapters] = useState<StoryChapter[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
    const [modalMode, setModalMode] = useState<"details" | "play" | null>(null);
    const [showInlinePlay, setShowInlinePlay] = useState<boolean>(false);
    const [progressMap, setProgressMap] = useState<ProgressMap>({});
    const [answer, setAnswer] = useState<string>("");
    const [toast, setToast] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    // 로그인 후 사용자가 해당 스토리에서 "시작하기"를 눌러 이어하기 노출을 허용했는지 여부
    const [resumeReadyMap, setResumeReadyMap] = useState<Record<string, boolean>>({});

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

    // 로그인 상태 동기화 (Header와 동일한 기준: localStorage.authToken)
    useEffect(() => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("authToken");
        setIsLoggedIn(!!token);

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "authToken") {
                setIsLoggedIn(!!e.newValue);
            }
        };

        const handleCustomStorageChange = (event: Event) => {
            const customEvent = event as unknown as CustomEvent<{ token?: string }>;
            const nextToken = customEvent?.detail?.token ?? localStorage.getItem("authToken");
            setIsLoggedIn(!!nextToken);
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("authTokenChange", handleCustomStorageChange as EventListener);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("authTokenChange", handleCustomStorageChange as EventListener);
        };
    }, []);

    // 로그인 상태 변경 시 이어하기 노출 준비 상태 초기화
    useEffect(() => {
        setResumeReadyMap({});
    }, [isLoggedIn]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1400);
        return () => clearTimeout(t);
    }, [toast]);

    // ESC 키로 모달 닫기
    useEffect(() => {
        if (!modalMode) return;
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSelectedStoryId(null);
                setModalMode(null);
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [modalMode]);

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

    const fetchChaptersForStory = async (storyId: number) => {
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

    const openPlay = async (storyId: number) => {
        setSelectedStoryId(storyId);
        setModalMode("play");
        setShowInlinePlay(false);
        await fetchChaptersForStory(storyId);
    };

    const openInlinePlay = async (storyId: number) => {
        setSelectedStoryId(storyId);
        setModalMode(null);
        setShowInlinePlay(true);
        await fetchChaptersForStory(storyId);
    };

    const handleStartStory = async (storyId: number) => {
        // 로그인 필요: 미로그인 시 로그인 페이지로 유도
        if (!isLoggedIn) {
            router.push(`/login?message=${encodeURIComponent("로그인 후 이용 가능합니다")}`);
            return;
        }
        // 기존 진행이 있으면 덮어쓰지 않고 이어하기만 허용
        const existing = progressMap[String(storyId)];
        if (existing) {
            setResumeReadyMap((prev) => ({ ...prev, [String(storyId)]: true }));
            setSelectedStoryId(storyId);
            setModalMode(null);
            setShowInlinePlay(true);
            setToast("이어하기 준비됨");
            await fetchChaptersForStory(storyId);
            return;
        }
        const now = Date.now();
        const next: ProgressMap = {
            ...progressMap,
            [String(storyId)]: { story_id: storyId, current_chapter: 1, status: "in_progress", started_at: now },
        };
        setProgressMap(next);
        writeProgress(next);
        setResumeReadyMap((prev) => ({ ...prev, [String(storyId)]: true }));
        setSelectedStoryId(storyId);
        setModalMode(null);
        setShowInlinePlay(true);
        setToast("미션 시작!");
        await fetchChaptersForStory(storyId);
    };

    const handleSubmitMission = () => {
        if (!selectedStory || !currentChapter) return;
        const p = progressMap[String(selectedStory.id)];

        // 간단한 검증 (quiz만 정답 확인)
        if (currentChapter!.mission_type === "quiz") {
            const correct = String(currentChapter!.mission_payload?.answer ?? "")
                .trim()
                .toLowerCase();
            if (correct && correct !== answer.trim().toLowerCase()) {
                setToast("정답이 아니에요");
                return;
            }
        }

        // 다음 챕터로 이동 또는 스토리 완료
        const chapterIdx = selectedChapters.findIndex((c) => c.chapter_number === currentChapter!.chapter_number);
        const isLast = chapterIdx === selectedChapters.length - 1;
        const now = Date.now();

        const nextProgress: UserStoryProgress = isLast
            ? {
                  story_id: selectedStory.id,
                  current_chapter: currentChapter!.chapter_number,
                  status: "completed",
                  started_at: p?.started_at ?? now,
                  completed_at: now,
              }
            : {
                  story_id: selectedStory.id,
                  current_chapter: currentChapter!.chapter_number + 1,
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
                        const imageSrc = (s.imageUrl || badge?.image_url) as string | undefined;
                        return (
                            <div key={s.id} className="border rounded-2xl p-0 hover:bg-gray-50 overflow-hidden">
                                {imageSrc && (
                                    <div className="w-full h-40 bg-gray-100">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imageSrc} alt={s.title} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="p-4">
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
                                    {badge && (
                                        <div className="text-xs text-gray-600 mb-3">🏅 보상 배지: {badge.name}</div>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`/api/escape/stories?storyId=${s.id}`);
                                                    const fresh = await res.json();
                                                    setStories((prev) =>
                                                        prev.map((it) => (it.id === s.id ? { ...it, ...fresh } : it))
                                                    );
                                                } catch {}
                                                setSelectedStoryId(s.id);
                                                setModalMode("details");
                                            }}
                                            className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100 hover:cursor-pointer"
                                        >
                                            자세히 보기
                                        </button>
                                        {pr?.status === "completed" ? (
                                            <button
                                                onClick={() => openPlay(s.id)}
                                                className="hover:cursor-pointer px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                                            >
                                                다시 보기
                                            </button>
                                        ) : (
                                            (() => {
                                                const canContinue =
                                                    !!isLoggedIn && !!pr && !!resumeReadyMap[String(s.id)];
                                                return (
                                                    <button
                                                        onClick={() =>
                                                            canContinue ? openInlinePlay(s.id) : handleStartStory(s.id)
                                                        }
                                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 hover:cursor-pointer"
                                                    >
                                                        {canContinue ? "이어하기" : "시작하기"}
                                                    </button>
                                                );
                                            })()
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 상세/미션 진행은 모달로 표시되도록 변경 */}
            </section>

            {/* 이어하기(인라인) 진행 UI */}
            {selectedStory && showInlinePlay && (
                <section className="max-w-7xl mx-auto px-4 pb-12">
                    <div className="border rounded-2xl p-4">
                        {(() => {
                            const src = (selectedStory.imageUrl ||
                                badges.find((b) => b.id === selectedStory.reward_badge_id)?.image_url) as
                                | string
                                | undefined;
                            if (!src) return null;
                            return (
                                <div className="w-full h-56 rounded-xl overflow-hidden mb-4 bg-gray-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} alt={selectedStory.title} className="w-full h-full object-cover" />
                                </div>
                            );
                        })()}
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">{selectedStory.title}</h2>
                                <p className="text-sm text-gray-600 mt-1">{selectedStory.synopsis}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowInlinePlay(false);
                                    setSelectedStoryId(null);
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700 border px-3 py-1.5 rounded-lg hover:cursor-pointer"
                            >
                                닫기
                            </button>
                        </div>

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

                        {(currentChapter as StoryChapter | null) && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold">
                                        Chapter {currentChapter!.chapter_number}. {currentChapter!.title}
                                    </h3>
                                    <span className="text-xs text-gray-500">총 {selectedChapters.length}장</span>
                                </div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                                    {currentChapter!.story_text || "미션 설명이 제공되지 않았습니다."}
                                </div>
                                {currentChapter!.mission_type === "quiz" && (
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            placeholder={currentChapter!.mission_payload?.question || "정답 입력"}
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
                                {currentChapter!.mission_type === "location" && (
                                    <div className="text-sm text-gray-600 mb-3">
                                        힌트: {currentChapter!.mission_payload?.hint || "주변을 살펴보세요."}
                                    </div>
                                )}
                                {currentChapter!.mission_type === "photo" && (
                                    <div className="text-sm text-gray-600 mb-3">
                                        미션: {currentChapter!.mission_payload?.tip || "사진을 촬영해 인증해보세요."}
                                    </div>
                                )}

                                {storyProgress?.status !== "completed" && currentChapter!.mission_type !== "quiz" && (
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
                </section>
            )}

            {/* 상세 모달 */}
            {selectedStory && modalMode === "details" && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4"
                    onClick={() => {
                        setSelectedStoryId(null);
                        setModalMode(null);
                    }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4">
                            {(() => {
                                const src = (selectedStory.imageUrl ||
                                    badges.find((b) => b.id === selectedStory.reward_badge_id)?.image_url) as
                                    | string
                                    | undefined;
                                if (!src) return null;
                                return (
                                    <div className="w-full h-72 rounded-xl overflow-hidden mb-4 bg-gray-100">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={src}
                                            alt={selectedStory.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                );
                            })()}
                            <div className="flex items-start mb-3">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">{selectedStory.title}</h2>
                                    <p className="text-sm text-gray-600 mt-1">{selectedStory.synopsis}</p>
                                </div>
                            </div>

                            {/* details 모달에서는 진행도 표시를 숨김 */}

                            {/* details 모달에서는 챕터 UI는 숨김 */}
                            {false && currentChapter && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold">
                                            Chapter {currentChapter!.chapter_number}. {currentChapter!.title}
                                        </h3>
                                        <span className="text-xs text-gray-500">총 {selectedChapters.length}장</span>
                                    </div>
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                                        {currentChapter!.story_text || "미션 설명이 제공되지 않았습니다."}
                                    </div>
                                    {/* 미션 UI */}
                                    {currentChapter!.mission_type === "quiz" && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <input
                                                value={answer}
                                                onChange={(e) => setAnswer(e.target.value)}
                                                placeholder={currentChapter!.mission_payload?.question || "정답 입력"}
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
                                    {currentChapter!.mission_type === "location" && (
                                        <div className="text-sm text-gray-600 mb-3">
                                            힌트: {currentChapter!.mission_payload?.hint || "주변을 살펴보세요."}
                                        </div>
                                    )}
                                    {currentChapter!.mission_type === "photo" && (
                                        <div className="text-sm text-gray-600 mb-3">
                                            미션:{" "}
                                            {currentChapter!.mission_payload?.tip || "사진을 촬영해 인증해보세요."}
                                        </div>
                                    )}

                                    {storyProgress?.status !== "completed" &&
                                        currentChapter!.mission_type !== "quiz" && (
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
                                                <div className="text-sm font-semibold">
                                                    배지 획득: {earnedBadge!.name}
                                                </div>
                                                <div className="text-xs text-gray-600">{earnedBadge!.description}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 플레이 모달 (미션 진행) */}
            {selectedStory && modalMode === "play" && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4"
                    onClick={() => {
                        setSelectedStoryId(null);
                        setModalMode(null);
                    }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">{selectedStory.title}</h2>
                                    <p className="text-sm text-gray-600 mt-1">{selectedStory.synopsis}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedStoryId(null);
                                        setModalMode(null);
                                    }}
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

                            {(currentChapter as StoryChapter | null) && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold">
                                            Chapter {currentChapter!.chapter_number}. {currentChapter!.title}
                                        </h3>
                                        <span className="text-xs text-gray-500">총 {selectedChapters.length}장</span>
                                    </div>
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                                        {currentChapter!.story_text || "미션 설명이 제공되지 않았습니다."}
                                    </div>
                                    {/* 미션 UI */}
                                    {currentChapter!.mission_type === "quiz" && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <input
                                                value={answer}
                                                onChange={(e) => setAnswer(e.target.value)}
                                                placeholder={currentChapter!.mission_payload?.question || "정답 입력"}
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
                                    {currentChapter!.mission_type === "location" && (
                                        <div className="text-sm text-gray-600 mb-3">
                                            힌트: {currentChapter!.mission_payload?.hint || "주변을 살펴보세요."}
                                        </div>
                                    )}
                                    {currentChapter!.mission_type === "photo" && (
                                        <div className="text-sm text-gray-600 mb-3">
                                            미션:{" "}
                                            {currentChapter!.mission_payload?.tip || "사진을 촬영해 인증해보세요."}
                                        </div>
                                    )}

                                    {storyProgress?.status !== "completed" &&
                                        currentChapter!.mission_type !== "quiz" && (
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
                                                <div className="text-sm font-semibold">
                                                    배지 획득: {earnedBadge.name}
                                                </div>
                                                <div className="text-xs text-gray-600">{earnedBadge.description}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-lg shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}
