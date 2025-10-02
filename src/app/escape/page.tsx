"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// --- 타입 정의 ---
type Badge = { id: number; name: string; description: string; image_url?: string };
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
    level?: number | string;
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
    current_chapter: number;
    status: "not_started" | "in_progress" | "completed";
    started_at?: number | null;
    completed_at?: number | null;
};
type ProgressMap = Record<string, UserStoryProgress>;

// --- LocalStorage 헬퍼 함수 ---
const STORAGE_KEY = "escape_progress_v1";
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
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
}

// --- 커스텀 훅: 게임 로직 분리 ---
function useEscapeGame() {
    const router = useRouter();
    const [stories, setStories] = useState<Story[]>([]);
    const [chapters, setChapters] = useState<Record<number, StoryChapter[]>>({});
    const [badges, setBadges] = useState<Badge[]>([]);
    const [progressMap, setProgressMap] = useState<ProgressMap>({});
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [toast, setToast] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        setProgressMap(readProgress());
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch("/api/escape/stories?nocache=1", { cache: "no-store" });
                if (!res.ok) throw new Error("API response was not ok");
                const data = await res.json();
                const storyData = Array.isArray(data) ? data : Array.isArray(data?.stories) ? data.stories : [];
                const badgeData: Badge[] = [];
                storyData.forEach((s: any) => {
                    if (s.badge) badgeData.push(s.badge);
                });

                setStories(storyData);
                setBadges(badgeData);
            } catch (e) {
                console.error("Failed to load stories", e);
                setToast("스토리 정보를 불러오는데 실패했습니다.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        setIsLoggedIn(!!token);
        const handleAuthChange = () => setIsLoggedIn(!!localStorage.getItem("authToken"));
        window.addEventListener("authTokenChange", handleAuthChange);
        return () => window.removeEventListener("authTokenChange", handleAuthChange);
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 2000);
        return () => clearTimeout(timer);
    }, [toast]);

    const fetchChaptersForStory = useCallback(
        async (storyId: number) => {
            if (chapters[storyId]) return chapters[storyId];
            try {
                const res = await fetch(`/api/escape/chapters?storyId=${storyId}`);
                const data = await res.json();
                const sortedChapters = Array.isArray(data)
                    ? data.sort((a, b) => a.chapter_number - b.chapter_number)
                    : [];
                setChapters((prev) => ({ ...prev, [storyId]: sortedChapters }));
                return sortedChapters;
            } catch (e) {
                console.error("Failed to load chapters for story", storyId, e);
                setToast("챕터 정보를 불러오는데 실패했습니다.");
                return [];
            }
        },
        [chapters]
    );

    const handleStartStory = (storyId: number) => {
        if (!isLoggedIn) {
            router.push(`/login?message=${encodeURIComponent("로그인 후 이용 가능합니다.")}`);
            return;
        }

        const existingProgress = progressMap[String(storyId)];
        if (!existingProgress || existingProgress.status === "not_started") {
            const newProgress: UserStoryProgress = {
                story_id: storyId,
                current_chapter: 1,
                status: "in_progress",
                started_at: Date.now(),
            };
            const nextMap = { ...progressMap, [String(storyId)]: newProgress };
            setProgressMap(nextMap);
            writeProgress(nextMap);
        }
        router.push(`/escape/intro?id=${storyId}`);
    };

    return {
        stories,
        badges,
        chapters,
        progressMap,
        isLoggedIn,
        isLoading,
        toast,
        fetchChaptersForStory,
        handleStartStory,
        setToast,
    };
}

// --- UI 컴포넌트들 ---

const StoryCard = ({
    story,
    badge,
    progress,
    onStart,
    onResume,
    onDetails,
    isFirst,
}: {
    story: Story;
    badge?: Badge;
    progress?: UserStoryProgress;
    onStart: (id: number) => void;
    onResume: (id: number) => void; // ✅ onResume 타입을 추가하여 에러 해결
    onDetails: (id: number) => void;
    isFirst: boolean;
}) => {
    const imageSrc = story.imageUrl || badge?.image_url || "";
    const isCompleted = progress?.status === "completed";
    const isInProgress = progress?.status === "in_progress";

    const getDifficultyStars = (level?: number | string) => {
        let lv = 0;
        if (level !== undefined && level !== null) {
            const parsed = parseInt(
                String(level).replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)),
                10
            );
            if (!isNaN(parsed) && parsed > 0) lv = Math.min(5, parsed);
        }
        return Array.from({ length: 5 }).map((_, i) => (
            <svg
                key={i}
                className={`w-4 h-4 ${i < lv ? "text-yellow-400" : "text-gray-300"}`}
                viewBox="0 0 20 20"
                fill="currentColor"
            >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.035a1 1 0 00-1.175 0l-2.802 2.035c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
            </svg>
        ));
    };

    return (
        <div
            className="group flex flex-col gap-4 border rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white"
            onClick={() => onDetails(story.id)}
        >
            {imageSrc ? (
                <div className="relative h-40 rounded-2xl overflow-hidden">
                    <Image
                        src={imageSrc}
                        alt={story.title}
                        fill
                        priority={isFirst}
                        sizes="100vw"
                        className="object-cover"
                    />
                </div>
            ) : (
                <div className="h-40 rounded-2xl bg-gray-100" />
            )}
            <div className="pt-1 pr-4 pb-4 pl-4">
                <div className="mb-2 flex items-center justify-between">
                    <div>
                        {story.region && (
                            <span className="inline-block bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                                #{story.region}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1" title={`난이도 ${story.level || 0}/5`}>
                        {getDifficultyStars(story.level)}
                    </div>
                </div>
                <div className="mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{story.title}</h3>
                </div>

                <p
                    className="text-gray-600 mb-4"
                    style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {story.synopsis}
                </p>
                {badge && (
                    <div className="text-xs text-amber-700 mb-4 bg-amber-50 px-2 py-1 rounded-md inline-block">
                        🏅 보상 배지: {badge.name}
                    </div>
                )}
                <div className="flex items-center justify-end gap-3">
                    {isCompleted ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDetails(story.id);
                            }}
                            className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                            완료 (상세)
                        </button>
                    ) : isInProgress ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onResume(story.id);
                            }}
                            className="px-4 py-2 rounded-full text-sm font-semibold btn-primary"
                        >
                            이어하기
                        </button>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onStart(story.id);
                            }}
                            className="px-4 py-2 rounded-full text-sm font-semibold btn-primary"
                        >
                            시작하기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const DetailsModal = ({
    story,
    chapters,
    badge,
    isOpen,
    onClose,
    onStart,
}: {
    story: Story | null;
    chapters: StoryChapter[];
    badge?: Badge | null;
    isOpen: boolean;
    onClose: () => void;
    onStart: (id: number) => void;
}) => {
    if (!isOpen || !story) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} role="dialog" aria-modal="true">
            <div className="absolute inset-x-0 bottom-0">
                <div
                    className="mx-auto max-w-[500px] bg-white rounded-t-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-full h-6 flex items-center justify-center">
                        <div className="mt-2 h-1.5 w-12 rounded-full bg-gray-300" />
                    </div>
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                        {story.imageUrl && (
                            <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4 bg-gray-100">
                                <Image
                                    src={story.imageUrl}
                                    alt={story.title}
                                    fill
                                    className="object-cover"
                                    sizes="100vw"
                                />
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-gray-900">{story.title}</h2>
                        <p className="text-gray-700 mt-2">{story.synopsis}</p>
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">챕터 목록</h3>
                            <ul className="space-y-2">
                                {chapters.length > 0 ? (
                                    chapters.map((c) => (
                                        <li
                                            key={c.id}
                                            className="text-sm text-gray-700 bg-gray-50 rounded-md px-4 py-3"
                                        >
                                            <span className="font-semibold">Chapter {c.chapter_number}:</span> {c.title}
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-sm text-gray-500">챕터 정보를 불러오는 중...</li>
                                )}
                            </ul>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                닫기
                            </button>
                            <button
                                onClick={() => onStart(story.id)}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                시작하기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 메인 페이지 컴포넌트 ---
export default function EscapePage() {
    const { stories, badges, chapters, progressMap, isLoading, toast, fetchChaptersForStory, handleStartStory } =
        useEscapeGame();

    const [activeModalStoryId, setActiveModalStoryId] = useState<number | null>(null);

    const handleOpenDetails = (storyId: number) => {
        fetchChaptersForStory(storyId);
        setActiveModalStoryId(storyId);
    };

    const handleCloseModal = () => {
        setActiveModalStoryId(null);
    };

    // 이어하기 로직도 시작하기와 동일하게 intro 페이지로 이동
    const handleResumeStory = (storyId: number) => {
        handleStartStory(storyId);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const startId = params.get("startId");
        if (startId && stories.length > 0) {
            const storyId = parseInt(startId, 10);
            if (stories.some((s) => s.id === storyId)) {
                handleStartStory(storyId);
                const newUrl = window.location.pathname;
                window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
            }
        }
    }, [stories, handleStartStory]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white shadow-sm">
                <div className="max-w-[400px] mx-auto px-4 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">사건 파일</h1>
                            <p className="text-gray-600 mt-2">도심을 누비며 챕터를 완료하고 배지를 획득하세요!</p>
                        </div>
                    </div>
                </div>
            </div>

            <section className="max-w-[500px] mx-auto px-4 py-8">
                <div className="grid grid-cols-1 gap-6">
                    {isLoading
                        ? [...Array(3)].map((_, i) => (
                              <div key={i} className="bg-white rounded-2xl shadow-md animate-pulse">
                                  <div className="h-40 bg-gray-200 rounded-t-2xl" />
                                  <div className="p-6 space-y-3">
                                      <div className="h-6 bg-gray-300 rounded w-2/3" />
                                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                                      <div className="h-4 bg-gray-200 rounded w-full" />
                                      <div className="h-10 bg-gray-300 rounded w-28 ml-auto" />
                                  </div>
                              </div>
                          ))
                        : stories.map((story, index) => (
                              <StoryCard
                                  key={story.id}
                                  story={story}
                                  badge={badges.find((b) => b.id === story.reward_badge_id)}
                                  progress={progressMap[String(story.id)]}
                                  onStart={handleStartStory}
                                  onResume={handleResumeStory}
                                  onDetails={handleOpenDetails}
                                  isFirst={index < 2}
                              />
                          ))}
                </div>
            </section>

            <DetailsModal
                isOpen={!!activeModalStoryId}
                onClose={handleCloseModal}
                story={stories.find((s) => s.id === activeModalStoryId) || null}
                chapters={chapters[activeModalStoryId!] || []}
                badge={badges.find((b) => b.id === stories.find((s) => s.id === activeModalStoryId)?.reward_badge_id)}
                onStart={handleStartStory}
            />
            <div className="md:hidden h-20" />
        </div>
    );
}
