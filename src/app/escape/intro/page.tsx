"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamicImport from "next/dynamic";
import imageCompression from "browser-image-compression";

// --- 타입 정의 ---
type DialogueMessage = {
    speaker: string;
    text: string;
    role?: string; // user | npc | system (옵션)
};

type Story = {
    id: number;
    title: string;
    synopsis: string;
    imageUrl?: string | null;
    epilogue_text?: any;
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
    story_text?: string | DialogueMessage[];
    mission_type?: string;
    mission_payload?: any;
    placeOptions?: Array<{
        id: number;
        name: string;
        address?: string;
        latitude?: number | null;
        longitude?: number | null;
        description?: string;
        imageUrl?: string;
        signature?: string;
    }>;
};

// --- 로딩 컴포넌트 ---
function LoadingSpinner() {
    return (
        <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-[1001]">
            <p className="text-xl text-gray-700 font-serif">이야기를 불러오는 중...</p>
        </div>
    );
}

// --- 대화형 인트로 컴포넌트 ---
const DialogueFlow = ({
    messages,
    step,
    onNext,
    onComplete,
    letterMode = false,
    onLetterOpened,
    fallbackParts,
}: {
    messages: string | DialogueMessage[] | undefined;
    step: number;
    onNext: () => void;
    onComplete: () => void;
    letterMode?: boolean;
    onLetterOpened?: (opened: boolean) => void;
    fallbackParts?: string[];
}) => {
    // 1장 인트로: 편지가 날아와 도착 → 클릭 시 모달로 펼침
    const [letterArrived] = useState<boolean>(!!letterMode);
    const [showLetter, setShowLetter] = useState<boolean>(false);
    const [arrived, setArrived] = useState<boolean>(false);
    const [opened, setOpened] = useState<boolean>(false);
    const [visibleMessageCount, setVisibleMessageCount] = useState<number>(1);
    const messageListRef = useRef<HTMLDivElement | null>(null);

    const letterItems = useMemo(() => {
        if (!showLetter) return [] as Array<{ text: string; isUser: boolean; speaker?: string }>;
        const norm = (s: any) =>
            String(s ?? "")
                .trim()
                .toLowerCase();
        if (Array.isArray(messages)) {
            const arr = (messages as DialogueMessage[])
                .map((m) => ({
                    text: String(m?.text || "").trim(),
                    isUser: norm(m?.role) === "user" || ["user", "me", "나"].includes(norm(m?.speaker)),
                    speaker: m?.speaker,
                }))
                .filter((m) => m.text.length > 0);
            if (arr.length > 0) return arr;
        } else if (typeof messages === "string") {
            const arr = messages
                .split(/\n{2,}/)
                .map((s, i) => ({ text: s.trim(), isUser: i % 2 === 1 }))
                .filter((m) => m.text.length > 0);
            if (arr.length > 0) return arr;
        }
        // 최후 보정: 전달받은 fallbackParts를 채팅처럼 번갈아 배치
        if (Array.isArray(fallbackParts) && fallbackParts.length > 0) {
            return fallbackParts
                .map((t, i) => ({ text: String(t || "").trim(), isUser: i % 2 === 1 }))
                .filter((m) => m.text.length > 0);
        }
        return [] as Array<{ text: string; isUser: boolean; speaker?: string }>;
    }, [showLetter, messages, fallbackParts]);

    useEffect(() => {
        if (!showLetter) return;
        const t1 = setTimeout(() => setArrived(true), 5);
        const t2 = setTimeout(() => setOpened(true), 240);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [showLetter]);

    // 편지 열림 시에는 부모에 통지하지 않음 (닫을 때만 통지)

    // 열림 이후 2초마다 한 줄씩 추가 표시 + 자동 스크롤
    useEffect(() => {
        if (!showLetter || !opened) return;
        setVisibleMessageCount(1);
        const total = letterItems.length;
        if (total <= 1) return;
        const id = setInterval(() => {
            setVisibleMessageCount((n) => {
                const next = Math.min(n + 1, total);
                if (next === total) clearInterval(id);
                return next;
            });
        }, 2000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened, showLetter, letterItems.length]);

    useEffect(() => {
        try {
            if (messageListRef.current) {
                messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
            }
        } catch {}
    }, [visibleMessageCount]);

    // 도착 알림(중앙 작은 봉투 버튼) – 클릭 시 모달 열림 (텍스트 없이 아이콘만)
    if (letterMode && !showLetter) {
        return (
            <div className="fixed inset-0 z-[1450] pointer-events-none flex items-center justify-center">
                <button
                    onClick={() => setShowLetter(true)}
                    className="pointer-events-auto select-none relative"
                    aria-label="편지 열기"
                >
                    <svg
                        width="72"
                        height="52"
                        viewBox="0 0 72 52"
                        xmlns="http://www.w3.org/2000/svg"
                        className="animate-bounce drop-shadow-lg"
                    >
                        <rect
                            x="1.5"
                            y="1.5"
                            rx="8"
                            ry="8"
                            width="69"
                            height="49"
                            fill="#F8E7A3"
                            stroke="#C9A04A"
                            strokeWidth="3"
                        />
                        <path
                            d="M6 16 L36 32 L66 16"
                            fill="none"
                            stroke="#C9A04A"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-rose-600 text-white text-[10px] font-bold border border-white shadow">
                            1
                        </span>
                    </span>
                </button>
            </div>
        );
    }

    if (showLetter) {
        const items = letterItems;
        return (
            <div className="fixed inset-0 z-[1450] bg-transparent flex items-center justify-center p-6">
                <div
                    className={`relative w-full max-w-lg transition-transform duration-700 ease-out ${
                        arrived ? "translate-y-0 scale-100 rotate-0" : "-translate-y-16 scale-95 rotate-3"
                    }`}
                >
                    {/* 봉투 바디 */}
                    <div className="relative bg-[#faf7f1] rounded-2xl shadow-2xl border border-amber-200 flex flex-col max-h-[80vh]">
                        {/* 봉투 덮개(열림 효과) */}
                        <div
                            className={`absolute inset-x-0 top-0 h-10 bg-amber-200/60 transition-all duration-700 ${
                                opened ? "-translate-y-10 opacity-0" : "translate-y-0 opacity-100"
                            }`}
                        />
                        {/* 편지지 노출 */}
                        <div
                            className={`px-6 pt-6 pb-3 transition-all duration-700 ${
                                opened ? "opacity-100" : "opacity-0"
                            } overflow-hidden flex-1 min-h-0`}
                            style={{ maxHeight: opened ? "unset" : 0 }}
                        >
                            <h3 className="text-center text-xl font-semibold text-gray-800 mb-3">비밀 편지</h3>
                            <div ref={messageListRef} className="max-h-[56vh] overflow-y-auto space-y-3 pr-1">
                                {items.slice(0, visibleMessageCount).map((m, i) => {
                                    const identity = String((m as any)?.role || (m as any)?.speaker || "")
                                        .trim()
                                        .toLowerCase();
                                    const isSystem = identity === "system";
                                    if (isSystem) {
                                        return (
                                            <div key={i} className="flex justify-center animate-fade-in-up">
                                                <div className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-50 text-amber-800 text-base shadow-sm font-medium">
                                                    {m.text}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={i} className={`flex ${m.isUser ? "justify-end" : "justify-start"}`}>
                                            <div
                                                className={`px-4 py-2 rounded-2xl max-w-[80%] shadow ${
                                                    m.isUser
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-white text-gray-900 border"
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {((items.length > 0 && visibleMessageCount >= items.length) || items.length === 0) && (
                                <div className="mt-3 p-3 border-t bg-[#faf7f1] sticky bottom-0 text-center">
                                    <button
                                        onClick={() => {
                                            // 닫기를 눌러야만 진행되도록: 먼저 모달 상태 정리
                                            setShowLetter(false);
                                            setOpened(false);
                                            // 부모에 닫힘 통지 → 카테고리 화면으로 전환
                                            try {
                                                if (typeof onLetterOpened === "function") onLetterOpened(false);
                                            } catch {}
                                            // onComplete 콜백(있다면) 호출
                                            if (typeof onComplete === "function") onComplete();
                                        }}
                                        className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow"
                                    >
                                        닫기
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    // 메시지가 문자열인 경우: 문단 단위로 쪼개서 채팅 스타일로 보여주기
    if (typeof messages === "string") {
        const parts = messages
            .split(/\n{2,}/)
            .map((s) => s.trim())
            .filter(Boolean);
        return (
            <div className="fixed inset-0 z-[1400] bg-gradient-to-b from-black/60 to-black/20 backdrop-blur-[2px] flex items-end justify-center p-4 animate-fade-in">
                <div className="w-full max-w-3xl bg-[#fffef8]/95 rounded-t-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.15)] border-t border-amber-100 font-['Gowun_Dodum']">
                    <div className="max-h-[46vh] overflow-y-auto space-y-4 pr-1">
                        {parts.map((t, i) => (
                            <div
                                key={i}
                                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"} animate-fade-in-up`}
                            >
                                <div
                                    className={`${
                                        i % 2 === 0
                                            ? "bg-[#fffdf7] text-gray-900 border border-amber-200 shadow-sm"
                                            : "bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-lg"
                                    } px-5 py-3 rounded-2xl max-w-[80%] leading-relaxed tracking-wide`}
                                >
                                    {t}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-right mt-4">
                        <button
                            onClick={onComplete}
                            className="px-6 py-2.5 bg-gradient-to-b from-amber-400 to-amber-600 text-white rounded-full shadow-inner hover:brightness-105 transition-all"
                        >
                            미션 시작하기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!messages || !Array.isArray(messages)) {
        const text = "이 챕터의 이야기가 시작됩니다.";
        return (
            <div className="fixed inset-0 z-[1400] bg-black/60 flex items-end justify-center p-4 animate-fade-in">
                <div className="w-full max-w-3xl bg-white/90 backdrop-blur-md rounded-t-2xl p-4 shadow-lg border-t">
                    <div className="max-h-[46vh] overflow-y-auto space-y-3 pr-1">
                        <div className="flex justify-start">
                            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl max-w-[80%] shadow">
                                <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right mt-4">
                        <button onClick={onComplete} className="btn-vintage">
                            미션 시작하기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentMessage = messages[step];
    const isLastMessage = step >= messages.length - 1;

    const handleContinue = () => {
        if (isLastMessage) {
            onComplete();
        } else {
            onNext();
        }
    };

    if (!currentMessage) return null;

    return (
        <div className="fixed inset-0 z-[1400] bg-black/60 flex items-end justify-center p-4 animate-fade-in">
            <div className="w-full max-w-3xl bg-white/90 backdrop-blur-md rounded-t-2xl p-6 shadow-lg border-t">
                {currentMessage.speaker && currentMessage.speaker !== "narrator" && (
                    <p className="font-bold text-lg mb-2 text-gray-800">
                        {currentMessage.speaker === "user" ? "나" : currentMessage.speaker}
                    </p>
                )}
                <p className="text-gray-900 text-lg whitespace-pre-wrap min-h-[4em]">{currentMessage.text}</p>
                <div className="text-right mt-4">
                    <button onClick={handleContinue} className="btn-vintage">
                        {isLastMessage ? "미션 시작" : "계속"}
                    </button>
                </div>
            </div>
        </div>
    );
};

function EscapeIntroPageInner() {
    const COUNT_PAGES = 21;
    const numFlipPages = 11;
    const router = useRouter();
    const search = useSearchParams();
    const storyId = Number(search.get("id"));

    // --- 상태 관리 ---
    const [story, setStory] = useState<Story | null>(null);
    const [chapters, setChapters] = useState<StoryChapter[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [animationFinished, setAnimationFinished] = useState<boolean>(false);
    const [isClosing, setIsClosing] = useState<boolean>(false);
    const [currentChapterIdx, setCurrentChapterIdx] = useState<number>(0);
    const [puzzleAnswer, setPuzzleAnswer] = useState<string>("");
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [validationError, setValidationError] = useState<string>("");
    const [answerChecked, setAnswerChecked] = useState<boolean>(false);
    const STORAGE_KEY = useMemo(() => `escape_progress_${storyId}`, [storyId]);
    const [resumed, setResumed] = useState<boolean>(false);
    const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
    const [isEndFlip, setIsEndFlip] = useState<boolean>(false);
    const [badge, setBadge] = useState<{
        id: number;
        name: string;
        description?: string | null;
        image_url?: string | null;
    } | null>(null);
    const [endingFlowStarted, setEndingFlowStarted] = useState<boolean>(false);
    const [toast, setToast] = useState<string | null>(null);
    const [endingStep, setEndingStep] = useState<"finalMessage" | "epilogue" | "gallery" | "badge" | null>(null);
    // 대화형 인트로(기존 컴포넌트용) 상태
    const [isDialogueActive, setIsDialogueActive] = useState<boolean>(false);
    // 편지 닫을 때만 UI를 보이게 하기 위해 초기값 false 유지
    const [isLetterOpened, setIsLetterOpened] = useState<boolean>(false);
    // 비밀 편지를 이미 본 적이 있는지(스토리별) 영구 플래그
    const [letterEverShown, setLetterEverShown] = useState<boolean>(false);
    const [dialogueStep, setDialogueStep] = useState<number>(0);
    // 완료된 카테고리(카페 등)를 기록하여 카테고리 선택 화면에서 숨김 처리
    const [completedCategories, setCompletedCategories] = useState<string[]>([]);

    // 새 흐름 상태 (책 펼침 제거 UI)
    const [flowStep, setFlowStep] = useState<
        "prologue" | "category" | "placeList" | "dialogue" | "mission" | "pieceAward" | "walk" | "done"
    >("prologue");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedPlaceIndex, setSelectedPlaceIndex] = useState<number | null>(null);
    const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
    const [selectedPlaceType, setSelectedPlaceType] = useState<string | null>(null);
    const [selectedPlaceConfirm, setSelectedPlaceConfirm] = useState<number | null>(null);
    const [missionUnlocked, setMissionUnlocked] = useState<boolean>(false);
    const [answersByMission, setAnswersByMission] = useState<Record<number, string>>({});
    const [selectedSolvedMissionId, setSelectedSolvedMissionId] = useState<number | null>(null);
    const [missionModalOpen, setMissionModalOpen] = useState<boolean>(false);
    const [activeMission, setActiveMission] = useState<any | null>(null);
    // Modal answer/check states
    const [modalAnswer, setModalAnswer] = useState<string>("");
    const [modalWrongOnce, setModalWrongOnce] = useState<boolean>(false);
    const [modalError, setModalError] = useState<string | null>(null);
    // Post-mission story modal
    const [showPostStory, setShowPostStory] = useState<boolean>(false);
    const [postStoryQueue, setPostStoryQueue] = useState<string[]>([]);
    const [postStoryIdx, setPostStoryIdx] = useState<number>(0);

    const normalizeAnswer = (v: any): string =>
        String(v ?? "")
            .trim()
            .toLowerCase();
    const isCorrectForPayload = (payload: any, userInput: string): boolean => {
        const user = normalizeAnswer(userInput);
        const ans = (payload && (payload.answer ?? payload.correct ?? payload.answers)) as any;
        if (Array.isArray(ans)) return ans.some((a) => normalizeAnswer(a) === user);
        if (typeof ans === "number") return String(ans) === user;
        if (typeof ans === "string") return normalizeAnswer(ans) === user;
        return true;
    };
    const [placeDialogueDone, setPlaceDialogueDone] = useState<boolean>(false);
    const [dialogueQueue, setDialogueQueue] = useState<Array<{ speaker?: string | null; text: string }>>([]);
    const [piecesCollected, setPiecesCollected] = useState<number>(0);
    const [pendingNextChapterIdx, setPendingNextChapterIdx] = useState<number | null>(null);
    const [noteOpenAnim, setNoteOpenAnim] = useState<boolean>(false);
    const [titlePopAnim, setTitlePopAnim] = useState<boolean>(false);
    const introBgmRef = useRef<HTMLAudioElement | null>(null);
    const endingBgmRef = useRef<HTMLAudioElement | null>(null);
    const [prologueQueue, setPrologueQueue] = useState<string[]>([]);
    const [inSelectedRange, setInSelectedRange] = useState<boolean>(false);
    const [selectedDistance, setSelectedDistance] = useState<number | null>(null);

    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [photoUploaded, setPhotoUploaded] = useState<boolean>(false);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
    const [lastUploadedUrls, setLastUploadedUrls] = useState<string[]>([]);

    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    useEffect(() => {
        if (typeof window === "undefined" || !navigator?.geolocation) return;
        const onOk = (pos: GeolocationPosition) => {
            const { latitude, longitude } = pos.coords;
            setUserLocation({ lat: latitude, lng: longitude });
        };
        const onErr = () => {
            setUserLocation(null);
        };
        navigator.geolocation.getCurrentPosition(onOk, onErr, {
            enableHighAccuracy: true,
            maximumAge: 60_000,
            timeout: 8_000,
        });
        const watchId = navigator.geolocation.watchPosition(onOk, onErr, {
            enableHighAccuracy: true,
            maximumAge: 60_000,
            timeout: 20_000,
        });
        return () => navigator.geolocation.clearWatch?.(watchId);
    }, []);

    const requestLocation = () => {
        if (typeof window === "undefined" || !navigator?.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 }
        );
    };

    useEffect(() => {
        let timer: any;
        let lastNotifiedChapterId: number | null = null;
        let lastNotifiedStation = false;

        async function ensurePermission() {
            return;
        }

        async function poll() {
            try {
                if (!storyId || !userLocation) return;
                // 알림 권한/알림 노출 제거
                const res = await fetch("/api/escape/geofence", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        storyId,
                        lat: userLocation.lat,
                        lng: userLocation.lng,
                        radius: 150,
                        ...(selectedPlaceId ? { placeOptionId: selectedPlaceId } : {}),
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && typeof data?.inRange === "boolean" && selectedPlaceId) {
                    setInSelectedRange(Boolean(data.inRange));
                } else if (res.ok && data?.inRange && data?.started) {
                    const nearest = data.nearest as { type: "station" | "chapter"; id: number | null };
                    if (nearest?.type === "station" && !lastNotifiedStation) {
                        lastNotifiedStation = true;
                    } else if (nearest?.type === "chapter" && nearest?.id && lastNotifiedChapterId !== nearest.id) {
                        lastNotifiedChapterId = nearest.id;
                    }
                }
            } catch {}
        }
        timer = setInterval(poll, 10000);
        poll();
        return () => clearInterval(timer);
    }, [storyId, userLocation, selectedPlaceId]);

    const NaverMap = useMemo(
        () =>
            dynamicImport(() => import("@/components/NaverMap"), {
                ssr: false,
                loading: () => (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        지도 로딩...
                    </div>
                ),
            }),
        []
    );

    const [mountMapAfterOpen, setMountMapAfterOpen] = useState<boolean>(false);
    useEffect(() => {
        if (!animationFinished) return;
        const t = setTimeout(() => setMountMapAfterOpen(true), 150);
        return () => clearTimeout(t);
    }, [animationFinished]);

    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [showMapModal, setShowMapModal] = useState<boolean>(false);
    const [showIntroModal, setShowIntroModal] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia("(max-width: 768px)");
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener?.("change", update);
        return () => mq.removeEventListener?.("change", update);
    }, []);

    useEffect(() => {
        if (typeof document !== "undefined") {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
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

                if (storyData && !storyData.error) {
                    setStory(storyData);
                    const syn = String(storyData.synopsis || "").trim();
                    if (syn) {
                        const lines = syn
                            .split(/\n+/)
                            .map((s: string) => s.trim())
                            .filter(Boolean);
                        setPrologueQueue(lines);
                    }
                }

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

    useEffect(() => {
        const DURATION = 5000;
        const INITIAL = 500;
        const total = DURATION + INITIAL + 200;

        const animTimer = setTimeout(() => {
            setAnimationFinished(true);
        }, total);

        return () => clearTimeout(animTimer);
    }, []);

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
              ...(Number.isFinite(Number(selectedOptionIndex)) &&
              currentChapter.placeOptions &&
              currentChapter.placeOptions[selectedOptionIndex as number]
                  ? [
                        {
                            id: currentChapter.placeOptions[selectedOptionIndex as number]!.id,
                            name: currentChapter.placeOptions[selectedOptionIndex as number]!.name,
                            latitude: Number(currentChapter.placeOptions[selectedOptionIndex as number]!.latitude ?? 0),
                            longitude: Number(
                                currentChapter.placeOptions[selectedOptionIndex as number]!.longitude ?? 0
                            ),
                            address: currentChapter.placeOptions[selectedOptionIndex as number]!.address,
                        },
                    ]
                  : []),
          ]
        : [];

    const mapPlaces = userLocation
        ? [{ id: -1, name: "현재 위치", latitude: userLocation.lat, longitude: userLocation.lng }, ...currentPlace]
        : currentPlace;

    useEffect(() => {
        if (animationFinished && mountMapAfterOpen && currentChapter && chapters.length > 0) {
            const t = setTimeout(() => {
                setDialogueStep(0);
                // 항상 1챕터에서 편지를 보여줍니다 (한 번만 표시 로직 제거)
                if (currentChapter.chapter_number === 1) {
                    setIsDialogueActive(true);
                } else {
                    setIsDialogueActive(false);
                    setIsLetterOpened(true);
                }
            }, 80);
            return () => clearTimeout(t);
        }
    }, [animationFinished, mountMapAfterOpen, currentChapter, chapters.length, storyId]);

    const handleCloseBook = () => {
        setEndingStep(null);
        setIsClosing(true);
        setTimeout(() => {
            router.push("/");
        }, 1300);
    };

    const normalize = (v: any) =>
        String(v ?? "")
            .trim()
            .toLowerCase();

    const canProceed = useMemo(() => {
        if (!currentChapter) return false;
        const payload = currentChapter.mission_payload || {};
        const typeUpper = String(currentChapter.mission_type || "").toUpperCase();
        if (typeUpper === "PUZZLE_ANSWER") return answerChecked === true;
        if (typeUpper === "PHOTO") return photoUploaded === true;
        if (Array.isArray(payload?.options) && payload.options.length > 0) {
            if (selectedOptionIndex === null) return false;
            const ans: any = payload?.answer;
            if (ans === undefined || ans === null) return true;
            if (typeof ans === "number") {
                if (ans >= 1 && ans <= payload.options.length) return selectedOptionIndex === ans - 1;
                return selectedOptionIndex === ans;
            }
            return normalize(payload.options[selectedOptionIndex]) === normalize(ans);
        }
        return true;
    }, [currentChapter, puzzleAnswer, selectedOptionIndex, photoUploaded, answerChecked]);

    // 배경음 세팅 (선택 사항)
    useEffect(() => {
        try {
            if (!introBgmRef.current) {
                const a = new Audio("/sounds/intro.mp3");
                a.loop = true;
                a.volume = 0.4;
                introBgmRef.current = a;
                a.play().catch(() => {});
            }
        } catch {}
    }, []);

    // 스텝 전환 효과 및 오디오 전환
    useEffect(() => {
        if (flowStep === "category") {
            setTitlePopAnim(true);
            const audio = introBgmRef.current;
            if (audio) {
                let v = audio.volume;
                const t = setInterval(() => {
                    v = Math.max(0, v - 0.05);
                    audio.volume = v;
                    if (v <= 0) {
                        audio.pause();
                        clearInterval(t);
                    }
                }, 120);
            }
            const clear = setTimeout(() => setTitlePopAnim(false), 1200);
            return () => clearTimeout(clear);
        }
        if (flowStep === "mission") {
            setNoteOpenAnim(true);
            const clear = setTimeout(() => setNoteOpenAnim(false), 1000);
            return () => clearTimeout(clear);
        }
        if (flowStep === "done") {
            try {
                if (!endingBgmRef.current) {
                    const a = new Audio("/sounds/ending.mp3");
                    a.loop = true;
                    a.volume = 0.5;
                    endingBgmRef.current = a;
                    a.play().catch(() => {});
                }
            } catch {}
        }
    }, [flowStep]);

    const handleCheckAnswer = () => {
        if (!currentChapter) return;
        const payload = currentChapter.mission_payload || {};
        const expected = payload?.answer;
        const user = puzzleAnswer.trim();
        if (expected === undefined || expected === null) {
            if (user.length === 0) {
                setValidationError("답을 입력하세요.");
                return;
            }
            setAnswerChecked(true);
            setValidationError("");
            setToast("정답입니다!");
            return;
        }
        if (normalize(user) === normalize(expected)) {
            setAnswerChecked(true);
            setValidationError("");
            setToast("정답입니다!");
        } else {
            setValidationError("정답이 아니에요");
        }
    };

    const goToNextChapter = async () => {
        if (!currentChapter || isSubmitting) return;
        if (!canProceed) {
            setValidationError("미션을 완료해야 다음으로 진행할 수 있어요.");
            return;
        }

        setIsSubmitting(true);
        setValidationError("");
        setToast("미션 결과를 제출하는 중...");

        try {
            const missionType = String(currentChapter.mission_type || "").toUpperCase();
            let submissionPayload: any = { chapterId: currentChapter.id, isCorrect: true };

            if (missionType === "PHOTO") {
                if (photoFiles.length < 2) throw new Error("사진 2장을 업로드해 주세요.");

                setToast("사진을 압축하고 있어요...");
                const options = { maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true };
                const compressedFiles = await Promise.all(photoFiles.map((file) => imageCompression(file, options)));

                const formData = new FormData();
                compressedFiles.forEach((file) => formData.append("photos", file, file.name));

                setToast("사진을 업로드하는 중...");
                const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });

                if (!uploadResponse.ok) throw new Error(`업로드 실패: ${await uploadResponse.text()}`);

                const uploadResult = await uploadResponse.json();
                submissionPayload.photoUrls = uploadResult.photo_urls;
                if (Array.isArray(uploadResult.photo_urls)) setLastUploadedUrls(uploadResult.photo_urls);
            } else if (missionType === "PUZZLE_ANSWER") {
                submissionPayload.textAnswer = puzzleAnswer;
            }

            const submitResponse = await fetch("/api/submit-mission", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(submissionPayload),
            });
            const submitResult = await submitResponse.json();
            if (!submitResponse.ok) throw new Error(submitResult.message || "미션 결과 저장에 실패했습니다.");

            setToast("미션 완료!");

            const raw = localStorage.getItem(STORAGE_KEY);
            const obj = raw ? JSON.parse(raw) : {};
            obj[String(currentChapter.chapter_number)] = {
                ...obj[String(currentChapter.chapter_number)],
                completed: true,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));

            const nextIdx = currentChapterIdx + 1;
            if (nextIdx < chapters.length) {
                // 미션 완료 시: 편지 조각 효과 후 다음 카테고리로
                setPiecesCollected((n) => n + 1);
                setPendingNextChapterIdx(nextIdx);
                // 현재 챕터의 카테고리를 완료 목록에 저장
                try {
                    const first = (currentChapter.placeOptions || [])[0] as any;
                    const catKey = normalizeCategory(first?.category || first?.type || "");
                    if (catKey) {
                        setCompletedCategories((prev) => {
                            const next = Array.from(new Set([...(prev || []), catKey]));
                            // 로컬스토리지에도 함께 저장
                            const raw = localStorage.getItem(STORAGE_KEY);
                            const obj = raw ? JSON.parse(raw) : {};
                            obj.__completedCategories = next;
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
                            return next;
                        });
                    }
                } catch {}
                setFlowStep("pieceAward");
            } else {
                if (endingFlowStarted) return;
                setEndingFlowStarted(true);
                setIsEndFlip(true);
                setTimeout(async () => {
                    setIsEndFlip(false);
                    try {
                        const res = await fetch(`/api/escape/submissions?storyId=${storyId}`, {
                            credentials: "include",
                        });
                        const data = await res.json();
                        if (res.ok && Array.isArray(data?.urls)) setGalleryUrls(data.urls);
                    } catch {}
                    try {
                        const br = await fetch(`/api/escape/badge?storyId=${storyId}`);
                        const bd = await br.json();
                        if (br.ok && bd?.badge) {
                            setBadge(bd.badge);
                            if (bd.badge.id) {
                                const token = localStorage.getItem("authToken");
                                await fetch("/api/users/badges", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    },
                                    credentials: "include",
                                    body: JSON.stringify({ badgeId: bd.badge.id }),
                                });
                            }
                        }
                    } catch {}
                    setEndingStep("finalMessage");
                }, 800);
            }
        } catch (error: any) {
            setValidationError(error.message || "오류가 발생했습니다.");
            setToast(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const goToPrevChapter = () => {
        if (currentChapterIdx > 0) {
            setCurrentChapterIdx((prev) => prev - 1);
            setDialogueStep(0);
            setIsDialogueActive(true);
        }
    };
    // 1️⃣ chapters를 useMemo로 감싸기
    const memoChapters = useMemo(() => chapters, [chapters?.length]);
    // 카테고리 매칭 유틸: 다양한 표기를 하나의 키로 정규화 (availableCategoryKeys에서 사용하므로 먼저 선언)
    const normalizeCategory = (raw: unknown): string => {
        const s = String(raw || "")
            .toLowerCase()
            .replace(/\s+/g, "");
        if (["cafe", "카페", "카페투어"].includes(s)) return "cafe";
        if (["restaurant", "food", "맛집", "음식점", "식사", "레스토랑"].includes(s)) return "restaurant";
        if (["date", "walk", "산책", "데이트"].includes(s)) return "date";
        if (["dinner", "다이닝"].includes(s)) return "dinner"; // dinner 별도 취급
        if (s === "") return "misc";
        return s;
    };
    // 스토리에 실제 존재하는 카테고리만 버튼으로 노출
    const availableCategoryKeys = useMemo(() => {
        const s = new Set<string>();
        (chapters || []).forEach((ch: any) => {
            const first = (ch?.placeOptions || [])[0];
            const k = normalizeCategory(first?.category || first?.type || "");
            if (k) s.add(k);
        });
        return Array.from(s);
    }, [chapters]);

    // 2️⃣ useEffect에서 memoChapters 사용
    useEffect(() => {
        if (!currentChapter) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const obj = raw ? JSON.parse(raw) : {};
            const saved = obj[String(currentChapter.chapter_number)] || {};
            setPuzzleAnswer(saved.answer || "");
            setSelectedOptionIndex(typeof saved.option === "number" ? saved.option : null);
            setPhotoUploaded(!!saved.photo);
        } finally {
            setAnswerChecked(false);
            setPhotoPreviewUrl(null);
            setPhotoFiles([]);
            setValidationError("");
        }
    }, [currentChapterIdx, memoChapters, STORAGE_KEY]);

    useEffect(() => {
        const beforeUnload = () => {
            if (!currentChapter) return;
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const obj = raw ? JSON.parse(raw) : {};
                obj[String(currentChapter.chapter_number)] = {
                    ...obj[String(currentChapter.chapter_number)],
                    answer: puzzleAnswer,
                    option: selectedOptionIndex,
                    photo: photoUploaded,
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
            } catch {}
        };
        window.addEventListener("beforeunload", beforeUnload);
        return () => window.removeEventListener("beforeunload", beforeUnload);
    }, [STORAGE_KEY, currentChapter, puzzleAnswer, selectedOptionIndex, photoUploaded]);

    useEffect(() => {
        if (resumed || chapters.length === 0) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return setResumed(true);
            const obj = JSON.parse(raw) || {};
            const completedNumbers = Object.keys(obj)
                .filter((k) => obj[k]?.completed)
                .map(Number)
                .filter(Number.isFinite)
                .sort((a, b) => a - b);

            if (completedNumbers.length > 0) {
                const lastCompleted = completedNumbers.pop()!;
                const nextChapterIndex = chapters.findIndex((c) => c.chapter_number === lastCompleted + 1);
                if (nextChapterIndex !== -1) setCurrentChapterIdx(nextChapterIndex);
            }

            // 저장된 완료 카테고리 복원 (있으면 우선 사용)
            if (Array.isArray(obj.__completedCategories) && obj.__completedCategories.length > 0) {
                setCompletedCategories(
                    Array.from(new Set(obj.__completedCategories.map((s: any) => String(s || "").trim())))
                );
            } else if (completedNumbers.length > 0) {
                // 완료된 챕터 번호 기반으로 카테고리 추론하여 설정
                const cats: string[] = [];
                completedNumbers.forEach((num) => {
                    const ch = chapters.find((c) => c.chapter_number === num);
                    const first = (ch?.placeOptions || [])[0] as any;
                    const key = normalizeCategory(first?.category || first?.type || "");
                    if (key && !cats.includes(key)) cats.push(key);
                });
                setCompletedCategories(cats);
            }
        } catch {}
        setResumed(true);
    }, [chapters, STORAGE_KEY, resumed]);

    const matchesSelectedCategory = (place: any, sel: string | null): boolean => {
        if (!sel) return true;
        const normalizedSel = normalizeCategory(sel);
        const placeCat = normalizeCategory(place?.category || place?.type || "");
        if (!placeCat) return false; // 선택된 카테고리일 때는 비분류 항목 제외
        if (normalizedSel === placeCat) return true;
        // 보조 매칭: restaurant ↔ dinner/dining
        if (
            (normalizedSel === "restaurant" && ["dinner", "dining", "레스토랑"].includes(placeCat)) ||
            (normalizedSel === "date" && ["walk"].includes(placeCat))
        )
            return true;
        return false;
    };

    // 선택된 장소의 모든 미션을 반환 (없으면 챕터 대표 미션으로 폴백)
    const getSelectedPlaceMissions = (): any[] => {
        const placeList = (currentChapter as any)?.placeOptions || [];
        const placeById = selectedPlaceId ? placeList.find((p: any) => Number(p.id) === Number(selectedPlaceId)) : null;
        const placeByIndex = placeById || (selectedPlaceIndex != null ? placeList[selectedPlaceIndex as number] : null);
        const missions = Array.isArray((placeByIndex as any)?.missions) ? (placeByIndex as any).missions : [];
        if (missions.length > 0) return missions;
        // 폴백: 기존 챕터 대표 미션을 하나의 리스트로 노출
        if (currentChapter && (currentChapter as any).mission_type) {
            return [
                {
                    id: (currentChapter as any).id,
                    missionType: (currentChapter as any).mission_type,
                    missionPayload: (currentChapter as any).mission_payload || {},
                },
            ];
        }
        return [];
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    // 새 인트로 UI (책 펼침 제거, 배경 + 오버레이 레이아웃)
    const useNewIntroUI = true;
    if (useNewIntroUI) {
        const bgUrl = story?.imageUrl || "https://stylemap-images.s3.ap-southeast-2.amazonaws.com/homepage.png";
        const letterGateActive = currentChapter?.chapter_number === 1 && !isLetterOpened;
        return (
            <div className="relative min-h-screen">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgUrl})` }} />
                <div
                    className={`absolute inset-0 ${
                        letterGateActive ? "bg-transparent" : flowStep === "walk" ? "bg-black/45" : "bg-black/30"
                    } transition-colors duration-[1400ms] ${
                        flowStep === "done" ? "animate-[sunset_3000ms_linear_forwards]" : ""
                    }`}
                />
                <div className="absolute bottom-10 left-0 right-0 max-w-[980px] mx-auto px-4 pb-6">
                    {/* 편지 닫기 전에는 상단 버튼 등 UI 숨김 */}
                    {!letterGateActive ? (
                        <div className="flex justify-center gap-3 mb-4">
                            <button
                                onClick={() => setShowMapModal(true)}
                                className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white text-gray-900 shadow"
                            >
                                지도 보기
                            </button>
                            <button
                                onClick={() => setShowIntroModal(true)}
                                className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white text-gray-900 shadow"
                            >
                                대화 보기
                            </button>
                        </div>
                    ) : null}

                    <div
                        className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-transform duration-[1400ms] ease-in-out ${
                            flowStep === "walk" ? "translate-y-[-40px]" : "translate-y-0"
                        }`}
                    >
                        {/* 좌: 대화 영역 */}
                        <div className={`space-y-3 ${letterGateActive ? "hidden" : "block"}`}>
                            {flowStep === "prologue" && (
                                <div className="max-h-[46vh] overflow-auto space-y-3">
                                    {prologueQueue.slice(0, 4).map((line, idx) => (
                                        <div
                                            key={idx}
                                            className="inline-block max-w-[90%] bg-white/85 rounded-2xl px-4 py-3 text-gray-900 shadow"
                                        >
                                            {line}
                                        </div>
                                    ))}
                                    <div>
                                        <button
                                            className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                            onClick={() => {
                                                if (prologueQueue.length > 1) setPrologueQueue((q) => q.slice(1));
                                                else setFlowStep("category");
                                            }}
                                        >
                                            {prologueQueue.length > 1 ? "다음" : "카테고리 선택"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {flowStep === "category" && (
                                <div
                                    className={`grid grid-cols-2 gap-3 ${
                                        titlePopAnim ? "animate-[titlePop_400ms_ease-out]" : ""
                                    }`}
                                >
                                    {(() => {
                                        const label = (k: string) =>
                                            ((
                                                {
                                                    cafe: "☕ 카페",
                                                    date: "🌳 산책",
                                                    restaurant: "🍱 식사",
                                                    dinner: "🍷 다이닝",
                                                } as Record<string, string>
                                            )[k] || k);
                                        const base = availableCategoryKeys.map((k) => ({ key: k, label: label(k) }));
                                        let cats = base.filter((c) => !completedCategories.includes(c.key));
                                        // 모두 숨겨지면(=선택할 게 없으면) 필터링을 해제하여 보여줌
                                        if (cats.length === 0) cats = base;
                                        return cats.map((cat) => (
                                            <button
                                                key={cat.key}
                                                onClick={() => {
                                                    setSelectedCategory(cat.key);
                                                    // 카테고리에 해당하는 챕터로 이동 (카테고리-챕터 정합성 보장)
                                                    try {
                                                        const targetIdx = chapters.findIndex((ch: any) => {
                                                            const first = (ch?.placeOptions || [])[0];
                                                            const chCat = normalizeCategory(
                                                                first?.category || first?.type || ""
                                                            );
                                                            return chCat === cat.key;
                                                        });
                                                        if (targetIdx >= 0) setCurrentChapterIdx(targetIdx);
                                                    } catch {}
                                                    setSelectedPlaceId(null);
                                                    setInSelectedRange(false);
                                                    setMissionUnlocked(false);
                                                    setFlowStep("placeList");
                                                }}
                                                className="px-4 py-3 rounded-xl bg-white/85 hover:bg-white text-gray-900 shadow"
                                            >
                                                {cat.label}
                                            </button>
                                        ));
                                    })()}
                                </div>
                            )}

                            {flowStep === "placeList" && selectedCategory && (
                                <div className="space-y-2">
                                    {(() => {
                                        const all = ((currentChapter.placeOptions || []) as any[]).slice();
                                        const list = all.filter((p: any) =>
                                            matchesSelectedCategory(p, selectedCategory)
                                        );
                                        return list.map((p: any, idx: number) => (
                                            <div
                                                key={p.id}
                                                className={`p-3 rounded-xl border shadow cursor-pointer ${
                                                    selectedPlaceConfirm === p.id
                                                        ? "bg-emerald-50 border-emerald-300"
                                                        : "bg-white/85 hover:bg-white border-gray-200"
                                                }`}
                                                onClick={() => {
                                                    // 첫 클릭: 상세(주소/시그니처)만 보여주고 선택 대기
                                                    if (selectedPlaceConfirm !== p.id) {
                                                        setSelectedPlaceConfirm(p.id);
                                                        setSelectedPlaceIndex(idx);
                                                        setSelectedPlaceId(Number(p.id) || null);
                                                        setSelectedPlaceType(
                                                            (p.type || p.category || "").toString() || null
                                                        );
                                                        setInSelectedRange(false);
                                                        setMissionUnlocked(false);
                                                        return;
                                                    }
                                                    // 두번째 클릭: 해당 장소로 확정 → 대화/미션
                                                    const lines: Array<{ speaker?: string | null; text: string }> =
                                                        Array.isArray(p.stories) && p.stories.length > 0
                                                            ? p.stories
                                                                  .map((s: any) => ({
                                                                      speaker: s.speaker,
                                                                      text: s.dialogue || s.narration || "",
                                                                  }))
                                                                  .filter(
                                                                      (d: any) => d.text && d.text.trim().length > 0
                                                                  )
                                                            : [];

                                                    // 대사가 없으면 알림(도착 메시지) 대신 바로 미션으로 이동
                                                    if (lines.length === 0) {
                                                        setDialogueQueue([]);
                                                        setMissionUnlocked(true);
                                                        setFlowStep("mission");
                                                        return;
                                                    }

                                                    setDialogueQueue(lines);
                                                    setFlowStep("dialogue");
                                                    setMissionUnlocked(true);
                                                }}
                                            >
                                                <div className="font-semibold text-gray-900">{p.name}</div>
                                                {selectedPlaceConfirm === p.id && (p.address || p.signature) ? (
                                                    <div className="text-xs text-gray-700 mt-2 space-y-1">
                                                        {p.address && (
                                                            <div className="leading-relaxed">{p.address}</div>
                                                        )}
                                                        {p.signature && (
                                                            <div className="inline-flex items-center px-2 py-1 rounded-md bg-amber-100 text-amber-800">
                                                                {p.signature}
                                                            </div>
                                                        )}
                                                        <div className="text-[11px] text-gray-500">
                                                            한 번 더 클릭하면 이 장소로 진행합니다
                                                        </div>
                                                    </div>
                                                ) : (
                                                    p.address && (
                                                        <div className="text-xs text-gray-600 mt-0.5">{p.address}</div>
                                                    )
                                                )}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}

                            {flowStep === "dialogue" && (
                                <div
                                    className={`bg-white/85 rounded-xl p-4 border shadow transition-opacity duration-500 ${
                                        flowStep !== "dialogue" ? "opacity-0" : "opacity-100"
                                    }`}
                                >
                                    <div className="space-y-3">
                                        {selectedPlaceType && (
                                            <div className="inline-flex items-center px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-medium">
                                                {selectedPlaceType}
                                            </div>
                                        )}
                                        {dialogueQueue.length > 0 ? (
                                            <div className="text-gray-900 whitespace-pre-wrap">
                                                {dialogueQueue[0]?.speaker && (
                                                    <div className="text-sm text-gray-500 mb-1">
                                                        {dialogueQueue[0].speaker}
                                                    </div>
                                                )}
                                                {dialogueQueue[0]?.text || ""}
                                            </div>
                                        ) : (
                                            <div className="text-gray-700">대화가 종료되었습니다.</div>
                                        )}
                                        <div className="flex justify-end">
                                            <button
                                                className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
                                                onClick={() => {
                                                    if (dialogueQueue.length > 1) setDialogueQueue((q) => q.slice(1));
                                                    else {
                                                        // 장소 스토리 → 미션: 노트 펼침 효과와 함께 미션으로 전환
                                                        setPlaceDialogueDone(true);
                                                        setFlowStep("mission");
                                                        setTimeout(() => setPlaceDialogueDone(false), 600);
                                                    }
                                                }}
                                            >
                                                다음
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {flowStep === "pieceAward" && (
                                <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-900 px-4 py-5 text-center animate-[pieceFloat_800ms_ease-out]">
                                    <div className="text-2xl mb-2">✉️ 편지 조각 {piecesCollected} 획득!</div>
                                    <div className="text-sm mb-4">4개를 모으면 엔딩이 열립니다.</div>
                                    <button
                                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                        onClick={() => {
                                            if (piecesCollected >= 4) {
                                                setEndingFlowStarted(true);
                                                setEndingStep("finalMessage");
                                                setFlowStep("done");
                                            } else {
                                                // 다음 카테고리로 전환: 지도 줌아웃 연출
                                                setFlowStep("walk");
                                                const n =
                                                    typeof pendingNextChapterIdx === "number"
                                                        ? pendingNextChapterIdx
                                                        : null;
                                                setTimeout(() => {
                                                    if (n !== null) {
                                                        setCurrentChapterIdx(n);
                                                        setDialogueStep(0);
                                                        setSelectedCategory(null);
                                                        setSelectedPlaceIndex(null);
                                                    }
                                                    setFlowStep("category");
                                                    setPendingNextChapterIdx(null);
                                                }, 1200);
                                            }
                                        }}
                                    >
                                        {piecesCollected >= 4 ? "엔딩 보기" : "다음 장소로 이동"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 우: 미션 카드 - 지금은 선택 확정 즉시 표시 */}
                        {selectedPlaceId && missionUnlocked ? (
                            <div
                                className={`rounded-2xl bg-white/85 backdrop-blur p-4 border shadow transition-opacity duration-500 ${
                                    flowStep === "walk" || letterGateActive ? "opacity-0" : "opacity-100"
                                } ${noteOpenAnim && flowStep === "mission" ? "animate-[noteOpen_300ms_ease-out]" : ""}`}
                            >
                                <h3 className="text-lg font-bold text-gray-800 mb-3">미션</h3>
                                {/* 모든 미션 목록을 보여주고 사용자가 클릭하면 모달에서 풀이 */}
                                <div className="space-y-3">
                                    {(() => {
                                        const missions = getSelectedPlaceMissions();
                                        return missions.length > 0 ? (
                                            missions.map((m: any, mi: number) => {
                                                const payload = m?.missionPayload || {};
                                                return (
                                                    <button
                                                        key={mi}
                                                        className="w-full text-left rounded-lg border p-3 bg-white/95 hover:bg-white"
                                                        onClick={() => {
                                                            setActiveMission(m);
                                                            setMissionModalOpen(true);
                                                        }}
                                                    >
                                                        <div className="font-semibold text-gray-800">
                                                            {payload.question ||
                                                                payload.description ||
                                                                `미션 ${mi + 1}`}
                                                        </div>
                                                        {(() => {
                                                            const p: any = payload || {};
                                                            const base = p.hints ?? p.hint;
                                                            let hints: string[] = [];
                                                            if (Array.isArray(base)) hints = base.filter(Boolean);
                                                            else if (typeof base === "string" && base.trim())
                                                                hints = [base.trim()];
                                                            else {
                                                                Object.keys(p || {}).forEach((k) => {
                                                                    if (/^hint[_-]?\d+$/i.test(k) && p[k])
                                                                        hints.push(p[k]);
                                                                });
                                                            }
                                                            return hints.length > 0 ? (
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    힌트 {hints.length}개
                                                                </div>
                                                            ) : null;
                                                        })()}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="text-base text-gray-900 font-medium text-center">
                                                {currentChapter.mission_payload?.question ||
                                                    "진행 가능한 미션이 없습니다."}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="mt-4 flex justify-center">
                                    <button
                                        onClick={goToNextChapter}
                                        className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
                                        disabled={!canProceed || isSubmitting}
                                    >
                                        {isSubmitting ? "처리 중..." : "미션 완료 →"}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* 기존 대화형 인트로 오버레이 재사용 (유일한 위치에서만 렌더) */}
                {isDialogueActive && currentChapter && (
                    <DialogueFlow
                        messages={currentChapter.story_text}
                        step={dialogueStep}
                        onNext={() => setDialogueStep((s) => s + 1)}
                        onComplete={() => {
                            // 편지 닫기를 눌러야만 UI가 나타나도록 이 시점에서는 숨김 유지
                            setIsDialogueActive(false);
                            try {
                                const key = `escape_letter_shown_${storyId}`;
                                localStorage.setItem(key, "1");
                                setLetterEverShown(true);
                            } catch {}
                        }}
                        letterMode={currentChapter?.chapter_number === 1}
                        onLetterOpened={(opened) => {
                            // 열릴 때는 무시, 닫을 때만 UI 표시 + 프롤로그 건너뛰기
                            if (!opened) {
                                setIsLetterOpened(true);
                                setFlowStep("category");
                            }
                        }}
                        fallbackParts={(() => {
                            const syn = String(story?.synopsis || "").trim();
                            return syn
                                ? syn
                                      .split(/\n+/)
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                : [];
                        })()}
                    />
                )}

                {isMobile && showMapModal && (
                    <div
                        className={`fixed inset-0 z-[1400] bg-black/50 flex items-center justify-center p-4 ${
                            flowStep === "walk" ? "animate-[zoomOutBg_1000ms_ease-out]" : ""
                        }`}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="bg-white rounded-2xl w-full max-w-md h-[78vh] overflow-hidden relative">
                            <div className="absolute top-3 right-3 z-10">
                                <button
                                    onClick={() => setShowMapModal(false)}
                                    className="hover:cursor-pointer px-3 py-1.5 text-sm rounded-lg bg-black/80 text-white"
                                >
                                    닫기
                                </button>
                            </div>
                            <div className="w-full h-full min-h-[420px]">
                                <NaverMap
                                    places={mapPlaces as any}
                                    userLocation={userLocation as any}
                                    selectedPlace={null}
                                    onPlaceClick={() => {}}
                                    className="w-full h-full"
                                    drawPath={mapPlaces.length >= 2}
                                    routeMode={isMobile ? "walking" : "driving"}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 미션 풀이 모달 */}
                {missionModalOpen && activeMission && (
                    <div className="fixed inset-0 z-[1500] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md p-5 relative">
                            <button
                                onClick={() => setMissionModalOpen(false)}
                                className="absolute top-3 right-3 px-3 py-1.5 text-sm rounded-lg bg-black/80 text-white"
                            >
                                닫기
                            </button>
                            {(() => {
                                const t = String(activeMission?.missionType || "").toUpperCase();
                                const payload = activeMission?.missionPayload || {};
                                const p: any = payload || {};
                                const base = p.hints ?? p.hint;
                                let hints: string[] = [];
                                if (Array.isArray(base)) hints = base.filter(Boolean);
                                else if (typeof base === "string" && base.trim()) hints = [base.trim()];
                                else {
                                    Object.keys(p || {}).forEach((k) => {
                                        if (/^hint[_-]?\d+$/i.test(k) && p[k]) hints.push(p[k]);
                                    });
                                }
                                return (
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-bold text-gray-800">미션</h4>
                                        <div className="text-gray-900">
                                            {payload.question || payload.description || "미션"}
                                        </div>
                                        {t === "PUZZLE_ANSWER" && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={modalAnswer}
                                                    onChange={(e) => {
                                                        setModalAnswer(e.target.value);
                                                        setModalError(null);
                                                    }}
                                                    placeholder="정답 입력"
                                                    className="flex-1 px-3 py-2 rounded border text-gray-900"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const ok = isCorrectForPayload(payload, modalAnswer);
                                                        if (!ok) {
                                                            setModalWrongOnce(true);
                                                            setModalError("정답이 아니에요");
                                                            return;
                                                        }
                                                        setModalError(null);
                                                        setModalWrongOnce(false);
                                                        // 정답 처리: 챕터 진행 조건 충족을 위해 상태 동기화
                                                        setAnswerChecked(true);
                                                        setPuzzleAnswer(modalAnswer || "");
                                                        setMissionModalOpen(false);
                                                        // 미션 완룔 후: 선택한 장소의 stories 우선 재생
                                                        try {
                                                            const place = (currentChapter?.placeOptions || []).find(
                                                                (p: any) => Number(p.id) === Number(selectedPlaceId)
                                                            );
                                                            const placeQueue: string[] = Array.isArray(
                                                                (place as any)?.stories
                                                            )
                                                                ? (place as any).stories
                                                                      .map((s: any) =>
                                                                          String(
                                                                              s?.dialogue || s?.narration || s || ""
                                                                          ).trim()
                                                                      )
                                                                      .filter(Boolean)
                                                                : [];
                                                            if (placeQueue.length > 0) {
                                                                setPostStoryQueue(placeQueue);
                                                                setPostStoryIdx(0);
                                                                setShowPostStory(true);
                                                                return;
                                                            }
                                                        } catch {}
                                                        // 장소 스토리가 없으면 기존 흐름으로 바로 진행
                                                        goToNextChapter();
                                                    }}
                                                    className={`px-3 py-2 rounded text-sm text-white ${
                                                        answerChecked ? "bg-green-600" : "bg-blue-600"
                                                    }`}
                                                >
                                                    {answerChecked ? "확인됨" : "제출"}
                                                </button>
                                            </div>
                                        )}
                                        {modalError && <div className="text-sm text-red-600">{modalError}</div>}
                                        {t === "PHOTO" && (
                                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        if (files.length > 0) {
                                                            setPhotoFiles(files.slice(0, 5));
                                                            const url = URL.createObjectURL(files[0]);
                                                            setPhotoPreviewUrl(url);
                                                            const enough = files.length >= 2;
                                                            setPhotoUploaded(enough);
                                                            setValidationError(
                                                                enough ? "" : "사진 2장을 업로드해 주세요."
                                                            );
                                                        }
                                                    }}
                                                />
                                                <span>사진 업로드 (2장)</span>
                                            </label>
                                        )}
                                        {hints.length > 0 && modalWrongOnce && (
                                            <div className="text-sm text-gray-500 space-y-1">
                                                {hints.map((h, i) => (
                                                    <div key={i}>
                                                        힌트{hints.length > 1 ? ` ${i + 1}` : ""}: {h}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* 미션 이후 스토리 모달 */}
                {showPostStory && postStoryQueue.length > 0 && (
                    <div className="fixed inset-0 z-[1550] bg-black/40 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md p-5">
                            <div className="text-gray-900 whitespace-pre-wrap min-h-[4em]">
                                {postStoryQueue[postStoryIdx]}
                            </div>
                            <div className="text-right mt-4">
                                <button
                                    onClick={() => {
                                        if (postStoryIdx < postStoryQueue.length - 1) {
                                            setPostStoryIdx((i) => i + 1);
                                        } else {
                                            setShowPostStory(false);
                                            setPostStoryQueue([]);
                                            setPostStoryIdx(0);
                                            // 스토리 종료 후 조각 획득 단계로 연결
                                            setFlowStep("pieceAward");
                                        }
                                    }}
                                    className="px-4 py-2 rounded-lg bg-black text-white"
                                >
                                    {postStoryIdx < postStoryQueue.length - 1 ? "다음" : "닫기"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ✨ 컴포넌트가 모든 경우에 값을 반환하도록 null을 추가했습니다.
    return null;
}

export default function Page() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <EscapeIntroPageInner />
        </Suspense>
    );
}
