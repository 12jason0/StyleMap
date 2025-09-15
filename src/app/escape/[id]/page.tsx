"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";

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
};

type StoryChapter = {
    id: number;
    story_id: number;
    chapter_number: number;
    title: string;
    story_text?: string;
    mission_type?: "quiz" | "photo" | "location" | "none";
    mission_payload?: any;
};

type UserStoryProgress = {
    story_id: number;
    current_chapter: number;
    status: "not_started" | "in_progress" | "completed";
    started_at?: number | null;
    completed_at?: number | null;
};

// LocalStorage helpers (키는 목록 페이지와 동일하게 유지)
const STORAGE_KEY = "escape_progress_v1";
type ProgressMap = Record<string, UserStoryProgress>;

function readProgress(): ProgressMap {
    if (typeof window === "undefined") return {} as ProgressMap;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as ProgressMap) : ({} as ProgressMap);
    } catch {
        return {} as ProgressMap;
    }
}

function writeProgress(map: ProgressMap) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
}

export default function EscapePlayPage() {
    // KakaoMap 동적 로드 (SSR 회피)
    const KakaoMap = useMemo(
        () =>
            dynamic(() => import("@/components/KakaoMap"), {
                ssr: false,
                loading: () => (
                    <div className="w-full h-[420px] flex items-center justify-center text-sm text-gray-500">
                        지도 로딩 중...
                    </div>
                ),
            }),
        []
    );
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const storyId = Number(params?.id);

    const [story, setStory] = useState<Story | null>(null);
    const [chapters, setChapters] = useState<StoryChapter[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [progressMap, setProgressMap] = useState<ProgressMap>({});
    const [answer, setAnswer] = useState<string>("");
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (!storyId) return;
        // 진행 데이터 준비 (없으면 1챕터부터 시작)
        const initial = readProgress();
        if (!initial[String(storyId)]) {
            const now = Date.now();
            initial[String(storyId)] = {
                story_id: storyId,
                current_chapter: 1,
                status: "in_progress",
                started_at: now,
            };
            writeProgress(initial);
        }
        setProgressMap(initial);

        (async () => {
            try {
                const sRes = await fetch(`/api/escape/stories?storyId=${storyId}`);
                const s = await sRes.json();
                // level/difficulty 필드 정규화
                const normalized = s
                    ? {
                          ...s,
                          level: s.level ?? s.difficulty ?? s.difficulty_level ?? null,
                      }
                    : null;
                setStory(normalized);

                const cRes = await fetch(`/api/escape/chapters?storyId=${storyId}`);
                const c = await cRes.json();
                setChapters(Array.isArray(c) ? c : []);

                // 배지는 목록 페이지와 동일 포맷 가정 (안전하게 빈 배열)
                if (s?.badge) setBadges([s.badge as Badge]);
            } catch (e) {
                console.error("Failed to load story/chapters", e);
            }
        })();
    }, [storyId]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1400);
        return () => clearTimeout(t);
    }, [toast]);

    const selectedChapters = useMemo(
        () => chapters.filter((c) => c.story_id === storyId).sort((a, b) => a.chapter_number - b.chapter_number),
        [chapters, storyId]
    );

    const storyProgress = useMemo<UserStoryProgress | null>(() => {
        return progressMap[String(storyId)] || null;
    }, [progressMap, storyId]);

    const currentChapter = useMemo<StoryChapter | null>(() => {
        if (!selectedChapters.length) return null;
        const currentNo = storyProgress?.current_chapter ?? 1;
        return selectedChapters.find((c) => c.chapter_number === currentNo) || selectedChapters[0];
    }, [selectedChapters, storyProgress]);

    const earnedBadge = useMemo(() => {
        if (!story) return null;
        const pr = progressMap[String(story.id)];
        if (pr?.status === "completed" && story.reward_badge_id) {
            return badges.find((b) => b.id === story.reward_badge_id) || null;
        }
        return null;
    }, [badges, progressMap, story]);

    const handleSubmitMission = () => {
        if (!story || !currentChapter) return;
        const p = progressMap[String(story.id)];

        if (currentChapter.mission_type === "quiz") {
            const correct = String(currentChapter.mission_payload?.answer ?? "")
                .trim()
                .toLowerCase();
            if (correct && correct !== answer.trim().toLowerCase()) {
                setToast("정답이 아니에요");
                return;
            }
        }

        const chapterIdx = selectedChapters.findIndex((c) => c.chapter_number === currentChapter.chapter_number);
        const isLast = chapterIdx === selectedChapters.length - 1;
        const now = Date.now();

        const nextProgress: UserStoryProgress = isLast
            ? {
                  story_id: story.id,
                  current_chapter: currentChapter.chapter_number,
                  status: "completed",
                  started_at: p?.started_at ?? now,
                  completed_at: now,
              }
            : {
                  story_id: story.id,
                  current_chapter: currentChapter.chapter_number + 1,
                  status: "in_progress",
                  started_at: p?.started_at ?? now,
                  completed_at: null,
              };

        const nextMap = { ...progressMap, [String(story.id)]: nextProgress } as ProgressMap;
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

    // --- 대화형 스토리텔링: 말풍선/편지/나레이션 ---
    type ChatEntry = {
        role: "lp_kim" | "unknown" | "narration" | "letter";
        content: string;
    };

    const chatEntries: ChatEntry[] = useMemo(() => {
        if (!currentChapter) return [];
        const payload = currentChapter.mission_payload || {};
        if (Array.isArray(payload.chat)) {
            return payload.chat
                .filter((m: any) => typeof m?.content === "string" && m?.content.length > 0)
                .map((m: any) => ({
                    role: (m.role as ChatEntry["role"]) ?? "narration",
                    content: String(m.content),
                }));
        }
        // 폴백: 챕터 본문을 나레이션으로 노출
        const text = String(currentChapter.story_text || "").trim();
        return text ? [{ role: "narration", content: text }] : [];
    }, [currentChapter]);

    // 메시지 순차 노출(사람처럼) + 타이핑 인디케이터
    const [chatIndex, setChatIndex] = useState<number>(0);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const stepRef = useRef<((i: number) => void) | null>(null);
    const [pendingIndex, setPendingIndex] = useState<number | null>(null);
    useEffect(() => {
        setChatIndex(0);
        setIsTyping(false);
        if (chatEntries.length === 0) return;
        let mounted = true;
        let timer: any;
        const step = (i: number) => {
            if (!mounted) return;
            if (i >= chatEntries.length) return;
            const entry = chatEntries[i];
            // 모달로 보여줄 타입이면 모달 오픈 후 대기
            if (entry.role === "narration" || entry.role === "letter") {
                setModalContent(entry.content);
                setModalRole(entry.role);
                setShowMemo(true);
                setIsTyping(false);
                setPendingIndex(i);
                return; // 닫기 시 계속 진행
            }
            setIsTyping(true);
            timer = setTimeout(() => {
                setIsTyping(false);
                setChatIndex((prev) => prev + 1);
                step(i + 1);
            }, Math.min(1800, 700 + entry.content.length * 15));
        };
        stepRef.current = step;
        // 첫 메시지부터 진행
        step(0);
        return () => {
            mounted = false;
            if (timer) clearTimeout(timer);
        };
    }, [chatEntries]);

    const handleOptionSelect = (option: string) => {
        setAnswer(option);
        handleSubmitMission();
    };

    // --- 낡은 지도 메모 모달 ---
    const [showMemo, setShowMemo] = useState<boolean>(false);
    const [memoText, setMemoText] = useState<string>("");
    const [modalContent, setModalContent] = useState<string>("");
    const [modalRole, setModalRole] = useState<"narration" | "letter">("narration");
    useEffect(() => {
        if (!storyId) return;
        try {
            const saved = localStorage.getItem(`escape_notes_${storyId}`);
            if (saved) setMemoText(saved);
        } catch {}
    }, [storyId]);
    const saveMemo = () => {
        try {
            localStorage.setItem(`escape_notes_${storyId}`, memoText);
            setToast("메모 저장됨");
            setShowMemo(false);
            // 모달 종료 후 다음 메시지로 진행
            if (pendingIndex !== null) {
                setChatIndex((prev) => prev + 1);
                const next = pendingIndex + 1;
                setPendingIndex(null);
                setTimeout(() => stepRef.current && stepRef.current(next), 0);
            }
        } catch {}
    };

    const referenceImageUrl = "https://stylemap-images.s3.ap-southeast-2.amazonaws.com/map.png";

    // 코르크 보드 레이아웃 (원형 배치)
    const boardLayout = useMemo(
        () =>
            selectedChapters.map((c, idx) => {
                const count = Math.max(1, selectedChapters.length);
                const angle = (idx / count) * 2 * Math.PI;
                const cx = 50;
                const cy = 50;
                const rx = 36; // 가로 반지름(%)
                const ry = 26; // 세로 반지름(%)
                const x = cx + rx * Math.cos(angle);
                const y = cy + ry * Math.sin(angle);
                const rotate = idx % 2 === 0 ? -5 : 4;
                return {
                    id: c.id,
                    chapter: c.chapter_number,
                    title: c.title,
                    x,
                    y,
                    rotate,
                };
            }),
        [selectedChapters]
    );

    return (
        <div className="min-h-screen bg-white text-black">
            <section className="max-w-6xl mx-auto px-4 pt-24 pb-12">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">{story?.title || "플레이"}</h1>
                        {/* 가격 아래 정보 */}
                        <div className="mt-3 space-y-1 text-gray-900">
                            {typeof story?.estimated_duration_min === "number" && (
                                <div>
                                    <span className="font-semibold">시간</span> {story.estimated_duration_min}분
                                </div>
                            )}
                            {story?.price && (
                                <div>
                                    <span className="font-semibold">가격</span> {story.price}
                                </div>
                            )}
                            {/* 난이도 표시 제거 (요청) */}
                        </div>
                        <p className="text-gray-700 mt-1">{story?.synopsis}</p>
                    </div>
                    <button
                        onClick={() => router.push("/escape")}
                        className="text-sm text-gray-500 hover:text-gray-700 border px-3 py-1.5 rounded-lg hover:cursor-pointer"
                    >
                        목록으로
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

                {/* 지도 + 미션 카드 레이아웃 */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-7">
                        <div className="h-[420px] rounded-2xl overflow-hidden relative bg-gray-100 border border-gray-200 shadow">
                            <div className="absolute left-3 bottom-3 z-10">
                                <button
                                    onClick={() => {
                                        setModalContent(
                                            (currentChapter?.story_text || story?.synopsis || "").toString()
                                        );
                                        setModalRole("narration");
                                        setPendingIndex(null);
                                        setShowMemo(true);
                                    }}
                                    className="hover:cursor-pointer px-3 py-1.5 text-xs rounded-lg border bg-white/90 shadow hover:bg-white"
                                >
                                    낡은 지도
                                </button>
                            </div>
                            {/* 실(붉은 실) */}
                            <svg
                                className="absolute inset-0 w-full h-full"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                            >
                                <polyline
                                    points={boardLayout
                                        .map(
                                            (p) => `${Math.max(2, Math.min(98, p.x))},${Math.max(2, Math.min(98, p.y))}`
                                        )
                                        .join(" ")}
                                    fill="none"
                                    stroke="#b91c1c"
                                    strokeWidth="0.6"
                                />
                            </svg>
                            <KakaoMap
                                places={selectedChapters.map((c) => ({
                                    id: c.id,
                                    name: `Chapter ${c.chapter_number}`,
                                    latitude: Number((c as any).latitude ?? 37.5665),
                                    longitude: Number((c as any).longitude ?? 126.978),
                                    address: (c as any).address,
                                    order: c.chapter_number,
                                }))}
                                userLocation={null}
                                selectedPlace={
                                    currentChapter
                                        ? {
                                              id: currentChapter.id,
                                              name: `Chapter ${currentChapter.chapter_number}`,
                                              latitude: Number((currentChapter as any).latitude ?? 37.5665),
                                              longitude: Number((currentChapter as any).longitude ?? 126.978),
                                              address: (currentChapter as any).address,
                                          }
                                        : null
                                }
                                onPlaceClick={() => {}}
                                className="w-full h-full"
                                drawPath={true}
                                routeMode="simple"
                                ancientStyle={false}
                                highlightPlaceId={currentChapter?.id}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-5">
                        {currentChapter && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-5 py-4 border-b bg-gray-50">
                                    <div className="text-xs text-gray-500 mb-1">미션 카드</div>
                                    <div className="text-lg font-bold text-gray-900">
                                        Chapter {currentChapter.chapter_number}
                                    </div>
                                    <div className="text-sm text-gray-700">{currentChapter.title}</div>
                                </div>
                                <div className="p-5">
                                    <div className="text-sm text-gray-800 whitespace-pre-wrap mb-4">
                                        {currentChapter.story_text || "미션 설명이 제공되지 않았습니다."}
                                    </div>

                                    {currentChapter.mission_type === "quiz" && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <input
                                                value={answer}
                                                onChange={(e) => setAnswer(e.target.value)}
                                                placeholder={currentChapter.mission_payload?.question || "정답 입력"}
                                                className="border rounded-lg px-3 py-2 text-sm w-full"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleSubmitMission();
                                                }}
                                            />
                                            <button
                                                onClick={handleSubmitMission}
                                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                            >
                                                제출
                                            </button>
                                        </div>
                                    )}

                                    {/* 선택지(옵션형) 미션: mission_payload.options가 배열이면 버튼 렌더 */}
                                    {Array.isArray(currentChapter.mission_payload?.options) && (
                                        <div className="grid grid-cols-1 gap-2 mt-2">
                                            {(currentChapter.mission_payload.options as string[]).map((opt, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleOptionSelect(opt)}
                                                    className="w-full text-left px-4 py-2 rounded-lg border hover:bg-gray-50"
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {storyProgress?.status !== "completed" &&
                                        currentChapter.mission_type !== "quiz" && (
                                            <button
                                                onClick={handleSubmitMission}
                                                className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                                            >
                                                미션 완료하기
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
                            </div>
                        )}
                    </div>
                </div>

                {/* 대화형 스토리텔링 타임라인 */}
                <div className="mt-8 space-y-4">
                    {chatEntries.slice(0, chatIndex).map((m, idx) => {
                        if (m.role === "narration") {
                            return (
                                <div key={idx} className="text-center">
                                    <div className="inline-block max-w-2xl text-sm text-gray-800 leading-relaxed bg-gray-50 px-4 py-3 rounded-xl">
                                        {m.content}
                                    </div>
                                </div>
                            );
                        }
                        if (m.role === "letter") {
                            return (
                                <div key={idx} className="flex justify-center">
                                    <div className="relative max-w-xl w-full bg-[url('/images/letter-paper.png')] bg-cover bg-center rounded-2xl shadow p-6 text-gray-800">
                                        <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                                        <div className="absolute -top-3 -left-3 w-6 h-6 bg-red-400 rounded-full" />
                                        <div className="absolute -top-3 -right-3 w-6 h-6 bg-red-400 rounded-full" />
                                    </div>
                                </div>
                            );
                        }
                        const isLeft = m.role === "lp_kim";
                        return (
                            <div key={idx} className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
                                <div className={`flex items-end gap-2 max-w-xl`}>
                                    {isLeft && (
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src="/images/profile-lpkim.png"
                                                alt="LP Kim"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div
                                        className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                            isLeft ? "bg-white border" : "bg-gray-900 text-white"
                                        }`}
                                    >
                                        {m.content}
                                        <div
                                            className={`absolute ${
                                                isLeft ? "-left-2 bottom-2 border-l-white" : "-right-2 bottom-2"
                                            }`}
                                        />
                                    </div>
                                    {!isLeft && (
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src="/images/profile-unknown.png"
                                                alt="Unknown"
                                                className="w-full h-full object-cover opacity-80"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* 타이핑 인디케이터 */}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="flex items-end gap-2 max-w-xl">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                                    <img
                                        src="/images/profile-lpkim.png"
                                        alt="LP Kim"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="px-4 py-3 rounded-2xl bg-white border text-sm">
                                    <span className="inline-flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:120ms]" />
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:240ms]" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 낡은 지도 모달 (나레이션/편지 전용) + 참고 이미지 표시 */}
                {showMemo && (
                    <div
                        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                        onClick={() => setShowMemo(false)}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative bg-[url('/images/old-map.jpg')] bg-cover bg-center">
                                <div className="backdrop-brightness-95 p-6">
                                    <div className="text-white drop-shadow text-lg font-bold mb-3 flex items-center justify-between">
                                        <span>낡은 지도</span>
                                        {referenceImageUrl && (
                                            <span className="text-[11px] font-normal opacity-80">참고 이미지</span>
                                        )}
                                    </div>
                                    {/* 고대 지도 캔버스 */}
                                    <div className="relative w-full h-[280px] rounded-xl overflow-hidden border border-white/40 ring-1 ring-amber-200/60 shadow-lg bg-[url('/images/parchment-frame.png')] bg-cover bg-center contrast-125 saturate-125">
                                        {referenceImageUrl && (
                                            <div className="absolute inset-0 opacity-60">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={referenceImageUrl}
                                                    alt="reference"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <svg
                                            className="absolute inset-0 w-full h-full"
                                            viewBox="0 0 100 100"
                                            preserveAspectRatio="none"
                                        >
                                            <polyline
                                                points={boardLayout
                                                    .map(
                                                        (p) =>
                                                            `${Math.max(2, Math.min(98, p.x))},${Math.max(
                                                                2,
                                                                Math.min(98, p.y)
                                                            )}`
                                                    )
                                                    .join(" ")}
                                                fill="none"
                                                stroke="#f59e0b"
                                                strokeWidth="1.8"
                                                strokeDasharray="2.5 2.5"
                                                opacity="0.9"
                                                style={{ filter: "drop-shadow(0 0 2px rgba(245, 158, 11, .85))" }}
                                            />
                                        </svg>
                                        <style>
                                            {`@keyframes glowPulse {0%{opacity:.55; transform:scale(.92)}50%{opacity:1; transform:scale(1)}100%{opacity:.55; transform:scale(.92)}}`}
                                        </style>
                                        {boardLayout.map((p) => (
                                            <div
                                                key={p.id}
                                                className="absolute"
                                                style={{
                                                    left: `${p.x}%`,
                                                    top: `${p.y}%`,
                                                    transform: `translate(-50%, -50%) rotate(${p.rotate}deg)`,
                                                }}
                                            >
                                                <div
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold select-none border ${
                                                        currentChapter?.id === p.id
                                                            ? "bg-amber-400 text-amber-900 shadow-[0_0_12px_rgba(245,158,11,.9)] border-amber-200"
                                                            : "bg-amber-800/90 text-amber-100 shadow-[0_0_6px_rgba(0,0,0,.35)] border-amber-200/50"
                                                    }`}
                                                    style={
                                                        currentChapter?.id === p.id
                                                            ? { animation: "glowPulse 1.8s ease-in-out infinite" }
                                                            : {}
                                                    }
                                                    title={`${p.chapter}. ${p.title}`}
                                                >
                                                    ᚠ
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div
                                        className={`${
                                            modalRole === "letter"
                                                ? "bg-white/85 rounded-xl p-4 text-gray-800 mt-3"
                                                : "text-white whitespace-pre-wrap mt-3"
                                        }`}
                                    >
                                        {modalContent}
                                    </div>
                                    <div className="mt-3 flex justify-end gap-2">
                                        <button
                                            onClick={() => setShowMemo(false)}
                                            className="hover:cursor-pointer px-4 py-2 text-sm rounded-lg border bg-white/90 hover:bg-white"
                                        >
                                            닫기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {toast && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-lg shadow-lg">
                        {toast}
                    </div>
                )}
            </section>
        </div>
    );
}
