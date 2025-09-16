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
    // 상세 모달에서 챕터 클릭 시 하단에 펼칠 챕터 번호
    const [detailsOpenChapterNo, setDetailsOpenChapterNo] = useState<number | null>(null);
    // 상세 모달 챕터 잠금 해제 여부(1번 정답 입력 시 해제)
    const [detailsUnlocked, setDetailsUnlocked] = useState<boolean>(false);
    const [detailsAnswer, setDetailsAnswer] = useState<string>("");
    const [showLockedModal, setShowLockedModal] = useState<boolean>(false);
    const [detailsChapterAnswers, setDetailsChapterAnswers] = useState<Record<number, string>>({});

    const handleDetailsQuizSubmit = (chapter: StoryChapter) => {
        const userAnswer = (detailsChapterAnswers[chapter.chapter_number] || "").trim().toLowerCase();
        const correct = String((chapter.mission_payload as any)?.answer ?? "")
            .trim()
            .toLowerCase();
        if (!correct) {
            setToast("정답 정보가 없습니다");
            return;
        }
        if (userAnswer === correct) {
            if (chapter.chapter_number === 1) setDetailsUnlocked(true);
            // 다음 챕터로 이동
            const next = selectedChapters.find((c) => c.chapter_number === chapter.chapter_number + 1);
            if (next) {
                setDetailsOpenChapterNo(next.chapter_number);
            } else {
                setDetailsOpenChapterNo(chapter.chapter_number);
            }
            setToast("정답입니다!");
        } else {
            setToast("정답이 아니에요");
        }
    };

    useEffect(() => {
        const initial = readProgress();
        const pruned: ProgressMap = Object.fromEntries(
            Object.entries(initial).filter(([, v]) => v.status !== "completed")
        );
        setProgressMap(pruned);
        if (Object.keys(pruned).length !== Object.keys(initial).length) {
            writeProgress(pruned);
        }
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

    const firstChapter = useMemo(() => {
        if (!selectedChapters.length) return null;
        return selectedChapters[0];
    }, [selectedChapters]);

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

    const openDetails = async (storyId: number) => {
        try {
            const res = await fetch(`/api/escape/stories?storyId=${storyId}`);
            const fresh = await res.json();
            setStories((prev) => prev.map((it) => (it.id === storyId ? { ...it, ...fresh } : it)));
        } catch {}
        setSelectedStoryId(storyId);
        setModalMode("details");
        // 함께 스토리 챕터도 미리 로드
        await fetchChaptersForStory(storyId);
    };

    const handleStartStory = async (storyId: number) => {
        // 로그인 필요: 미로그인 시 로그인 페이지로 유도
        if (!isLoggedIn) {
            router.push(`/login?message=${encodeURIComponent("로그인 후 이용 가능합니다")}`);
            return;
        }
        // 진행 데이터 보장 (없으면 생성)
        const existing = progressMap[String(storyId)];
        if (!existing) {
            const now = Date.now();
            const next: ProgressMap = {
                ...progressMap,
                [String(storyId)]: { story_id: storyId, current_chapter: 1, status: "in_progress", started_at: now },
            };
            setProgressMap(next);
            writeProgress(next);
            // 서버 동기화는 기존 로직과 동일하게 챕터 로드 시점에 처리됨
        }
        // 모달/인라인 닫고 상세 플레이 페이지로 이동
        setSelectedStoryId(null);
        setModalMode(null);
        setShowInlinePlay(false);
        router.push(`/escape/${storyId}`);
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
                    <p className="text-gray-700 mt-1">도심을 누비며 챕터를 완료하고 배지를 획득하세요!</p>
                    <button
                        onClick={() => {
                            const initial = readProgress();
                            const pruned: ProgressMap = Object.fromEntries(
                                Object.entries(initial).filter(([, v]) => v.status !== "completed")
                            );
                            writeProgress(pruned);
                            setProgressMap(pruned);
                            setToast("완료 데이터가 삭제되었습니다");
                        }}
                        className="mt-2 text-xs text-gray-600 underline hover:text-gray-900"
                    >
                        완료 데이터 삭제
                    </button>
                </div>

                {/* 스토리 목록 - 가로형 포스터 카드 */}
                <div className="grid grid-cols-1 gap-6 mb-8">
                    {stories.map((s) => {
                        const pr = progressMap[String(s.id)];
                        const done = pr?.status === "completed";
                        const badge = s.reward_badge_id ? badges.find((b) => b.id === s.reward_badge_id) : null;
                        const imageSrc = (s.imageUrl || badge?.image_url) as string | undefined;
                        return (
                            <div
                                key={s.id}
                                className="group flex flex-row items-center gap-4 md:gap-10 bg-transparent rounded-none overflow-visible shadow-none pt-10"
                            >
                                {/* 좌측 포스터 */}
                                <div
                                    className="w-28 h-28 md:w-[420px] md:h-auto relative overflow-hidden hover:cursor-pointer flex-shrink-0 rounded-xl md:rounded-none"
                                    onClick={() => openDetails(s.id)}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {imageSrc && (
                                        <img
                                            src={imageSrc}
                                            alt={s.title}
                                            className="w-full h-full object-cover border-0 md:transform md:-translate-x-4 md:opacity-95 transition-all duration-700 ease-out md:group-hover:translate-x-0 md:group-hover:opacity-100"
                                        />
                                    )}
                                </div>

                                {/* 우측 상세 */}
                                <div className="flex-1 p-6">
                                    <div className="mb-2">
                                        {s.region && (
                                            <span className="inline-block text-xs font-semibold text-white bg-blue-600 px-3 py-1 rounded-full mr-2">
                                                #{s.region}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-extrabold text-gray-900 mb-3">{s.title}</h3>
                                    <div className="space-y-2 text-gray-800 text-sm mb-5">
                                        {s.price && (
                                            <div>
                                                가격 <span className="font-semibold">{s.price}</span>
                                            </div>
                                        )}
                                        {(() => {
                                            // 항상 별 5개 표시. level 값만큼 노란색으로, 값이 없거나 0/전각 ０이면 모두 회색
                                            const raw = (s as any).level;
                                            let lv = 0; // 기본값 0
                                            if (raw !== undefined && raw !== null) {
                                                let str = typeof raw === "number" ? String(raw) : String(raw).trim();
                                                // 전각 숫자(０-９)를 반각으로 치환
                                                str = str.replace(/[０-９]/g, (ch) =>
                                                    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
                                                );
                                                const parsed = parseInt(str, 10);
                                                if (Number.isFinite(parsed) && parsed > 0) {
                                                    lv = Math.min(5, Math.floor(parsed));
                                                }
                                            }
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <span>난이도</span>
                                                    <span
                                                        className="inline-flex items-center gap-1"
                                                        title={`난이도 ${lv}/5`}
                                                    >
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <svg
                                                                key={i}
                                                                className={`w-4 h-4 ${
                                                                    i < lv ? "text-yellow-400" : "text-gray-300"
                                                                }`}
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                                aria-hidden
                                                            >
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.035a1 1 0 00-1.175 0l-2.802 2.035c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
                                                            </svg>
                                                        ))}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <p className="text-gray-700 leading-relaxed mb-6">{s.synopsis}</p>

                                    {badge && (
                                        <div className="text-xs text-amber-700 mb-4 bg-amber-50 px-2 py-1 rounded-md inline-block">
                                            🏅 보상 배지: {badge.name}
                                        </div>
                                    )}

                                    {/* CTA */}
                                    <div className="mt-2">
                                        {!isLoggedIn ? (
                                            <div
                                                onClick={() => handleStartStory(s.id)}
                                                role="button"
                                                tabIndex={0}
                                                className="relative group/ticket w-full md:w-[320px] hover:cursor-pointer"
                                            >
                                                <div className="relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-white" />
                                                    <div className="absolute inset-x-0 bottom-0 h-0 bg-sky-400 transition-[height] duration-700 ease-out group-hover/ticket:h-full" />
                                                    <div className="relative text-center text-sky-600 group-hover/ticket:text-white transition-colors font-extrabold py-4 text-base md:text-lg">
                                                        시작하기
                                                    </div>
                                                </div>
                                                <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full" />
                                                <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 bg-white rounded-full" />
                                            </div>
                                        ) : pr?.status === "completed" ? (
                                            <button
                                                onClick={() => openPlay(s.id)}
                                                className="inline-flex justify-center w-full md:w-[420px] px-10 py-4 border-2 border-green-500 text-green-700 bg-transparent rounded-full text-base md:text-lg font-extrabold hover:bg-green-50 transition-colors duration-200 hover:cursor-pointer"
                                            >
                                                다시 보기
                                            </button>
                                        ) : (
                                            (() => {
                                                const canContinue =
                                                    !!isLoggedIn && !!pr && !!resumeReadyMap[String(s.id)];
                                                return (
                                                    <div
                                                        onClick={() =>
                                                            canContinue ? openInlinePlay(s.id) : handleStartStory(s.id)
                                                        }
                                                        role="button"
                                                        tabIndex={0}
                                                        className="relative group/ticket w-full md:w-[320px] hover:cursor-pointer"
                                                    >
                                                        <div className="relative overflow-hidden">
                                                            <div className="absolute inset-0 bg-white" />
                                                            <div className="absolute inset-x-0 bottom-0 h-0 bg-sky-400 transition-[height] duration-700 ease-out group-hover/ticket:h-full" />
                                                            <div className="relative text-center text-sky-600 group-hover/ticket:text-white transition-colors font-extrabold py-4 text-base md:text-lg">
                                                                {canContinue ? "이어하기" : "시작하기"}
                                                            </div>
                                                        </div>
                                                        <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full" />
                                                        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 bg-white rounded-full" />
                                                    </div>
                                                );
                                            })()
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* 개선된 인라인 플레이 UI */}
            {selectedStory && showInlinePlay && (
                <section className="max-w-5xl mx-auto px-4 pb-12">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl overflow-hidden shadow-lg border border-blue-100">
                        {/* 헤더 영역 */}
                        <div className="bg-white/80 backdrop-blur-sm p-6 border-b border-blue-100">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedStory.title}</h2>
                                    <p className="text-gray-700 leading-relaxed">{selectedStory.synopsis}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowInlinePlay(false);
                                        setSelectedStoryId(null);
                                    }}
                                    className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* 진행도 바 - 개선된 디자인 */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">진행 상황</span>
                                    <span className="text-sm text-gray-600">
                                        {storyProgress?.status === "completed"
                                            ? `완료 (${selectedChapters.length}/${selectedChapters.length})`
                                            : `${Math.max(0, (storyProgress?.current_chapter ?? 1) - 1)}/${
                                                  selectedChapters.length
                                              } 챕터`}
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
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
                            </div>
                        </div>

                        {/* 이미지 영역 - 더 나은 배치 */}
                        {(() => {
                            const src = (selectedStory.imageUrl ||
                                badges.find((b) => b.id === selectedStory.reward_badge_id)?.image_url) as
                                | string
                                | undefined;
                            if (!src) return null;
                            return (
                                <div className="px-6 pt-4">
                                    <div className="w-full h-64 rounded-2xl overflow-hidden bg-gray-100 shadow-md">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={src}
                                            alt={selectedStory.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 현재 챕터 콘텐츠 */}
                        {(currentChapter as StoryChapter | null) && (
                            <div className="p-6">
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                Chapter {currentChapter!.chapter_number}
                                            </h3>
                                            <h4 className="text-lg text-gray-700 font-medium">
                                                {currentChapter!.title}
                                            </h4>
                                        </div>
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                                            {selectedChapters.length}장 중 {currentChapter!.chapter_number}장
                                        </span>
                                    </div>

                                    {/* 스토리 텍스트 */}
                                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                        <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                            {currentChapter!.story_text || "미션 설명이 제공되지 않았습니다."}
                                        </div>
                                    </div>

                                    {/* 미션 UI - 개선된 디자인 */}
                                    {currentChapter!.mission_type === "quiz" && (
                                        <div className="bg-blue-50 rounded-xl p-4 mb-4">
                                            <h5 className="text-sm font-semibold text-blue-900 mb-3">💡 퀴즈 미션</h5>
                                            <p className="text-sm text-blue-800 mb-3">
                                                {currentChapter!.mission_payload?.question || "문제를 풀어보세요."}
                                            </p>
                                            <div className="flex gap-3">
                                                <input
                                                    value={answer}
                                                    onChange={(e) => setAnswer(e.target.value)}
                                                    placeholder="정답을 입력하세요"
                                                    className="flex-1 border-2 border-blue-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:outline-none transition-colors duration-200"
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") handleSubmitMission();
                                                    }}
                                                />
                                                <button
                                                    onClick={handleSubmitMission}
                                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                                                >
                                                    제출
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {currentChapter!.mission_type === "location" && (
                                        <div className="bg-green-50 rounded-xl p-4 mb-4">
                                            <h5 className="text-sm font-semibold text-green-900 mb-2">📍 위치 미션</h5>
                                            <p className="text-sm text-green-800">
                                                힌트: {currentChapter!.mission_payload?.hint || "주변을 살펴보세요."}
                                            </p>
                                        </div>
                                    )}

                                    {currentChapter!.mission_type === "photo" && (
                                        <div className="bg-purple-50 rounded-xl p-4 mb-4">
                                            <h5 className="text-sm font-semibold text-purple-900 mb-2">📸 사진 미션</h5>
                                            <p className="text-sm text-purple-800">
                                                {currentChapter!.mission_payload?.tip || "사진을 촬영해 인증해보세요."}
                                            </p>
                                        </div>
                                    )}

                                    {/* 완료 버튼 */}
                                    {storyProgress?.status !== "completed" &&
                                        currentChapter!.mission_type !== "quiz" && (
                                            <button
                                                onClick={handleSubmitMission}
                                                className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-200"
                                            >
                                                미션 완료하기
                                            </button>
                                        )}

                                    {/* 배지 획득 알림 */}
                                    {storyProgress?.status === "completed" && earnedBadge && (
                                        <div className="mt-6 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center text-white text-lg">
                                                    🏅
                                                </div>
                                                <div className="flex-1">
                                                    <h6 className="text-sm font-bold text-amber-900 mb-1">
                                                        축하합니다! 배지를 획득했습니다
                                                    </h6>
                                                    <p className="text-sm font-semibold text-amber-800">
                                                        {earnedBadge.name}
                                                    </p>
                                                    <p className="text-xs text-amber-700">{earnedBadge.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                        setDetailsOpenChapterNo(null);
                        setDetailsUnlocked(false);
                        setDetailsAnswer("");
                    }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
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
                                    <div className="w-full h-56 rounded-xl overflow-hidden mb-4 bg-gray-100">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={src}
                                            alt={selectedStory.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                );
                            })()}
                            <div className="mb-3">
                                <h2 className="text-xl font-semibold text-gray-900">{selectedStory.title}</h2>
                                <p className="text-sm text-gray-700 mt-1">{selectedStory.synopsis}</p>
                            </div>

                            {/* details 모달에서는 진행도 표시를 숨김 */}

                            {/* 챕터 미리보기 */}
                            <div className="mt-3">
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">챕터 목록</h4>
                                {selectedChapters.length > 0 ? (
                                    <>
                                        <ul className="space-y-2">
                                            {selectedChapters.map((c) => (
                                                <li
                                                    key={c.id}
                                                    onClick={() =>
                                                        setDetailsOpenChapterNo((prev) =>
                                                            prev === c.chapter_number ? null : c.chapter_number
                                                        )
                                                    }
                                                    className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2 hover:bg-gray-100 hover:cursor-pointer"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span>
                                                            Chapter {c.chapter_number}. {c.title}
                                                        </span>
                                                        {c.mission_type && (
                                                            <span className="text-xs text-gray-500">
                                                                {c.mission_type === "quiz"
                                                                    ? "퀴즈"
                                                                    : c.mission_type === "photo"
                                                                    ? "사진"
                                                                    : c.mission_type === "location"
                                                                    ? "위치"
                                                                    : ""}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {detailsOpenChapterNo === c.chapter_number && (
                                                        <div className="mt-2">
                                                            <div className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                                                                {c.story_text || "내용이 없습니다."}
                                                            </div>
                                                            {c.mission_type === "quiz" && (
                                                                <div className="mb-2">
                                                                    <div className="text-sm text-gray-700 mb-1">
                                                                        {(c.mission_payload as any)?.question ||
                                                                            "문제를 풀어보세요."}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            value={
                                                                                detailsChapterAnswers[
                                                                                    c.chapter_number
                                                                                ] || ""
                                                                            }
                                                                            onChange={(e) =>
                                                                                setDetailsChapterAnswers((prev) => ({
                                                                                    ...prev,
                                                                                    [c.chapter_number]: e.target.value,
                                                                                }))
                                                                            }
                                                                            placeholder="정답 입력"
                                                                            className="border rounded-lg px-3 py-2 text-sm w-full"
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter")
                                                                                    handleDetailsQuizSubmit(c);
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={() => handleDetailsQuizSubmit(c)}
                                                                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                                                        >
                                                                            제출
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {c.mission_type && (
                                                                <div className="text-xs text-gray-600">
                                                                    미션 유형:{" "}
                                                                    {c.mission_type === "quiz"
                                                                        ? "퀴즈"
                                                                        : c.mission_type === "photo"
                                                                        ? "사진"
                                                                        : c.mission_type === "location"
                                                                        ? "위치"
                                                                        : "없음"}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <div className="text-sm text-gray-500">챕터 정보를 불러오는 중...</div>
                                )}
                            </div>

                            {showLockedModal && (
                                <div
                                    className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
                                    onClick={() => setShowLockedModal(false)}
                                >
                                    <div
                                        className="bg-white rounded-xl max-w-sm w-full p-5"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="text-base font-semibold text-gray-900 mb-2">알림</div>
                                        <div className="text-sm text-gray-700 mb-4">
                                            안열리는 챕터입니다. 1번 챕터부터 해주세요.
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setShowLockedModal(false)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                                            >
                                                확인
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                                <div className="text-xs text-gray-700">{earnedBadge!.description}</div>
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
                        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">{selectedStory.title}</h2>
                                    <p className="text-sm text-gray-700 mt-1">{selectedStory.synopsis}</p>
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
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-4 py-3 rounded-lg shadow-lg z-50">
                    {toast}
                </div>
            )}
        </div>
    );
}
