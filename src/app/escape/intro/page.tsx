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

            // ✅ 동일한 텍스트 중복 제거
            const unique = arr.filter((v, i, self) => i === self.findIndex((x) => x.text === v.text));
            return unique;
        }

        if (typeof messages === "string") {
            const arr = messages
                .split(/\n{2,}/)
                .map((s, i) => ({ text: s.trim(), isUser: i % 2 === 1 }))
                .filter((m) => m.text.length > 0);
            return arr;
        }

        // fallbackParts는 messages가 완전히 없을 때만 사용
        if (!messages && Array.isArray(fallbackParts) && fallbackParts.length > 0) {
            return fallbackParts.map((t, i) => ({
                text: String(t || "").trim(),
                isUser: i % 2 === 1,
            }));
        }

        return [] as Array<{ text: string; isUser: boolean; speaker?: string }>;
    }, [showLetter, messages, fallbackParts]);

    // 줄 단위 표시 및 수동 진행 설정
    const autoAdvance = false;
    const flatLetterLines = useMemo(
        () =>
            (letterItems || []).flatMap((m) =>
                String(m?.text || "")
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((line) => ({ text: line, isUser: m.isUser, speaker: (m as any)?.speaker }))
            ),
        [letterItems]
    );

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

    // 열림 이후 수동/자동 진행 설정 + 자동 스크롤
    useEffect(() => {
        if (!showLetter || !opened) return;
        setVisibleMessageCount(1);
        const total = flatLetterLines.length;
        if (!autoAdvance || total <= 1) return;
        const id = setInterval(() => {
            setVisibleMessageCount((n) => {
                const next = Math.min(n + 1, total);
                if (next === total) clearInterval(id);
                return next;
            });
        }, 2000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened, showLetter, flatLetterLines.length]);

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
        const items = flatLetterLines;
        const goNextLine = () => {
            setVisibleMessageCount((n) => Math.min(n + 1, items.length));
        };
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
                            <div
                                ref={messageListRef}
                                className="max-h-[56vh] overflow-y-auto space-y-3 pr-1 pb-3 cursor-pointer"
                                onClick={goNextLine}
                            >
                                {items.slice(0, visibleMessageCount).map((m, i) => {
                                    const identity = String((m as any)?.role || (m as any)?.speaker || "")
                                        .trim()
                                        .toLowerCase();
                                    const isSystem = identity === "system";
                                    if (isSystem) {
                                        return (
                                            <div
                                                key={i}
                                                className={`flex justify-center ${
                                                    i === visibleMessageCount - 1 ? "animate-fade-in-up" : ""
                                                }`}
                                                style={
                                                    i === visibleMessageCount - 1
                                                        ? { animationDuration: "700ms" }
                                                        : undefined
                                                }
                                            >
                                                <div className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-50 text-amber-800 text-base shadow-sm font-medium">
                                                    <span className="leading-relaxed">{m.text}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div
                                            key={i}
                                            className={`flex ${m.isUser ? "justify-end" : "justify-start"} ${
                                                i === visibleMessageCount - 1 ? "animate-fade-in-up" : ""
                                            }`}
                                            style={
                                                i === visibleMessageCount - 1
                                                    ? { animationDuration: "700ms" }
                                                    : undefined
                                            }
                                        >
                                            <div className="max-w-[80%]">
                                                <div
                                                    className={`px-4 py-2 rounded-2xl shadow border text-left ${
                                                        m.isUser
                                                            ? "bg-amber-100 text-stone-900 border-amber-300"
                                                            : "bg-amber-50 text-stone-900 border-amber-200"
                                                    }`}
                                                >
                                                    <span className="leading-relaxed whitespace-pre-wrap break-words">
                                                        {m.text}
                                                    </span>
                                                </div>
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
                    <div className="max-h-[46vh] overflow-y-auto space-y-4 pr-1 pb-3">
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
                                    } px-5 py-3 rounded-2xl max-w-[80%] leading-relaxed tracking-wide whitespace-pre-wrap break-words`}
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
                    <div className="max-h-[46vh] overflow-y-auto space-y-3 pr-1 pb-3">
                        <div className="flex justify-start">
                            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl max-w-[80%] shadow">
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
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
                <p className="text-gray-900 text-lg whitespace-pre-wrap break-words min-h-[4em]">
                    {currentMessage.text}
                </p>
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
    const [selectedGallery, setSelectedGallery] = useState<string[]>([]);
    const collageCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isEndFlip, setIsEndFlip] = useState<boolean>(false);
    const [badge, setBadge] = useState<{
        id: number;
        name: string;
        description?: string | null;
        image_url?: string | null;
    } | null>(null);
    const [endingFlowStarted, setEndingFlowStarted] = useState<boolean>(false);
    const [endingDialogueStep, setEndingDialogueStep] = useState<number>(0);
    const [toast, setToast] = useState<string | null>(null);
    const [endingStep, setEndingStep] = useState<"finalMessage" | "epilogue" | "gallery" | "badge" | null>(null);
    // 대화형 인트로(기존 컴포넌트용) 상태
    const [isDialogueActive, setIsDialogueActive] = useState<boolean>(false);
    // 편지 닫을 때만 UI를 보이게 하기 위해, 로컬스토리지 상태를 우선 반영
    const [isLetterOpened, setIsLetterOpened] = useState<boolean>(() => {
        try {
            const key = `escape_letter_shown_${storyId}`;
            return localStorage.getItem(key) === "1";
        } catch {
            return false;
        }
    });
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
    const [solvedMissionIds, setSolvedMissionIds] = useState<number[]>([]);
    const [clearedMissions, setClearedMissions] = useState<Record<number, boolean>>({});
    const [clearedPlaces, setClearedPlaces] = useState<Record<number, boolean>>({});
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
    const [isMoving, setIsMoving] = useState<boolean>(false);

    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [photoUploaded, setPhotoUploaded] = useState<boolean>(false);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
    const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
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
                    fetch(`/api/escape/stories?storyId=${storyId}`, { cache: "no-store" }),
                    fetch(`/api/escape/chapters?storyId=${storyId}`, { cache: "no-store" }),
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

                // DB 기반 완료 카테고리 자동 비활성화 목록 가져오기
                try {
                    const cr = await fetch(`/api/escape/completed-categories?storyId=${storyId}`, {
                        credentials: "include",
                    });
                    const cd = await cr.json();
                    if (cr.ok && Array.isArray(cd?.categories)) {
                        // 정규화해 저장
                        const norm = (cd.categories as string[])
                            .map((s) =>
                                String(s || "")
                                    .toLowerCase()
                                    .replace(/\s+/g, "")
                            )
                            .filter(Boolean);
                        setCompletedCategories(Array.from(new Set(norm)));
                    }
                } catch {}
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
    // 엔딩 라벨 조건 추가했던 보조 상태 제거 (원복)

    // 지도에서는 사용자가 장소를 선택하기 전에는 장소 마커를 표시하지 않습니다.
    // 장소를 선택한 후에만 해당 장소 1개를 표시하고, 현재 위치와의 경로를 그립니다.
    const currentPlace = (() => {
        if (!currentChapter || !Array.isArray(currentChapter.placeOptions)) return [] as any[];
        const placeList: any[] = currentChapter.placeOptions as any[];
        const byId = selectedPlaceId ? placeList.find((p: any) => Number(p.id) === Number(selectedPlaceId)) : null;
        const byIndex = byId || (selectedPlaceIndex != null ? placeList[selectedPlaceIndex as number] : null);
        if (!byIndex) return [] as any[];
        return [
            {
                id: byIndex.id,
                name: byIndex.name,
                latitude: Number(byIndex.latitude ?? 0),
                longitude: Number(byIndex.longitude ?? 0),
                address: byIndex.address,
            },
        ];
    })();

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

    const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        try {
            const R = 6371; // km
            const toRad = (v: number) => (v * Math.PI) / 180;
            const dLat = toRad(lat2 - lat1);
            const dLng = toRad(lng2 - lng1);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        } catch {
            return NaN;
        }
    };

    const canProceed = useMemo(() => {
        // 선택된 장소의 미션 중 완료된 개수를 기준으로 진행 가능 여부를 판단한다
        const placeList = (currentChapter as any)?.placeOptions || [];
        const placeById = selectedPlaceId ? placeList.find((p: any) => Number(p.id) === Number(selectedPlaceId)) : null;
        const placeByIndex = placeById || (selectedPlaceIndex != null ? placeList[selectedPlaceIndex as number] : null);
        const missions: any[] = Array.isArray((placeByIndex as any)?.missions) ? (placeByIndex as any).missions : [];
        const missionIds: number[] =
            missions.length > 0
                ? missions.map((m: any) => Number(m.id)).filter(Number.isFinite)
                : (currentChapter as any)?.id
                ? [Number((currentChapter as any).id)]
                : [];

        const clearedCount = missionIds.filter(
            (mid) => !!clearedMissions[mid] || solvedMissionIds.includes(mid)
        ).length;
        return clearedCount >= 2;
    }, [selectedPlaceId, selectedPlaceIndex, currentChapterIdx, currentChapter, clearedMissions, solvedMissionIds]);

    // 미션 진행 중 강제 가드: 카테고리/장소 리스트가 다시 보이는 것을 방지
    const inMission = useMemo(() => Boolean(selectedPlaceId && missionUnlocked), [selectedPlaceId, missionUnlocked]);
    useEffect(() => {
        if (inMission && flowStep !== "mission") {
            setFlowStep("mission");
        }
    }, [inMission, flowStep]);

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

    // 엔딩 화면 기본값 보장: done 단계에서 endingStep이 비어 있으면 자동으로 갤러리로 세팅
    useEffect(() => {
        if (flowStep === "done" && !endingStep) {
            setEndingStep("gallery");
        }
    }, [flowStep, endingStep]);

    const handleToggleSelectPhoto = (url: string) => {
        setSelectedGallery((prev) => {
            if (prev.includes(url)) return prev.filter((u) => u !== url);
            if (prev.length >= 4) return prev; // 최대 4장
            return [...prev, url];
        });
    };

    const renderCollage = async () => {
        const urls = selectedGallery.slice(0, 4);
        if (urls.length !== 4) return;
        const canvas = collageCanvasRef.current || document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // DB에서 템플릿 조회 → 실패 시 로컬 기본 템플릿 사용
        let bgUrl = "/images/hongdaelatter_template.jpg";
        let framesPercent: Array<{ x: number; y: number; w: number; h: number }> | null = null;
        try {
            const res = await fetch("/api/collages/templates", { cache: "no-store" });
            const data = await res.json();
            const list = Array.isArray(data?.templates) ? data.templates : [];
            const t =
                list.find(
                    (it: any) =>
                        String(it?.name || "")
                            .toLowerCase()
                            .includes("hongdae") || String(it?.imageUrl || "").includes("hongdaelatter_template")
                ) || list[0];
            if (t) {
                if (t.imageUrl) bgUrl = String(t.imageUrl);
                if (t.framesJson && Array.isArray(t.framesJson)) framesPercent = t.framesJson as any;
            }
        } catch {}
        const loadImage = (src: string) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

        const [bg, ...photos] = await Promise.all([loadImage(bgUrl), ...urls.map(loadImage)]);
        canvas.width = bg.naturalWidth;
        canvas.height = bg.naturalHeight;
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        // DB 좌표가 없으면 기본값 사용
        if (!framesPercent) {
            framesPercent = [
                { x: 0.085, y: 0.275, w: 0.355, h: 0.315 },
                { x: 0.555, y: 0.275, w: 0.355, h: 0.315 },
                { x: 0.085, y: 0.705, w: 0.355, h: 0.315 },
                { x: 0.555, y: 0.705, w: 0.355, h: 0.315 },
            ];
        }
        const frames = framesPercent.map((f) => ({
            x: Math.round(f.x * canvas.width),
            y: Math.round(f.y * canvas.height),
            w: Math.round(f.w * canvas.width),
            h: Math.round(f.h * canvas.height),
        }));
        photos.forEach((img, i) => {
            const f = frames[i];
            const r = Math.min(img.naturalWidth / f.w, img.naturalHeight / f.h);
            const sw = f.w * r;
            const sh = f.h * r;
            const sx = (img.naturalWidth - sw) / 2;
            const sy = (img.naturalHeight - sh) / 2;
            ctx.drawImage(img, sx, sy, sw, sh, f.x, f.y, f.w, f.h);
        });
        collageCanvasRef.current = canvas;
    };

    const handleDownloadCollage = async () => {
        await renderCollage();
        const canvas = collageCanvasRef.current;
        if (!canvas) return;
        if (canvas.toBlob) {
            canvas.toBlob(
                (blob) => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "hongdae-secret-letter-collage.jpg";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                },
                "image/jpeg",
                0.92
            );
        } else {
            // 폴백: 일부 구형 브라우저
            const a = document.createElement("a");
            a.href = canvas.toDataURL("image/jpeg", 0.92);
            a.download = "hongdae-secret-letter-collage.jpg";
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    };

    const getCollageBlob = async (): Promise<Blob | null> => {
        await renderCollage();
        const canvas = collageCanvasRef.current;
        if (!canvas) return null;
        return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92));
    };

    const handleShareToInstagram = async () => {
        try {
            const blob = await getCollageBlob();
            if (!blob) return;
            const file = new File([blob], "collage.jpg", { type: "image/jpeg" });
            const canShareFiles = (navigator as any)?.canShare && (navigator as any).canShare({ files: [file] });
            if ((navigator as any)?.share && canShareFiles) {
                await (navigator as any).share({ files: [file], title: story?.title || "Stylemap", text: "#Stylemap" });
            } else {
                setToast("브라우저에서 직접 공유가 제한됩니다. 이미지를 다운로드해 인스타 앱에서 업로드해 주세요.");
                await handleDownloadCollage();
            }
        } catch (e) {
            setToast("공유 중 오류가 발생했습니다.");
        }
    };

    const handleSaveToMyPage = async () => {
        try {
            const blob = await getCollageBlob();
            if (!blob) return;
            const form = new FormData();
            form.append("files", new File([blob], "collage.jpg", { type: "image/jpeg" }));
            const up = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
            if (!up.ok) throw new Error(await up.text());
            const ur = await up.json();
            const url: string | undefined = Array.isArray(ur?.photo_urls) ? ur.photo_urls[0] : undefined;
            if (!url) throw new Error("업로드 URL 생성 실패");
            const last = (chapters || [])
                .slice()
                .sort((a: any, b: any) => Number(a.chapter_number || 0) - Number(b.chapter_number || 0))
                .pop();
            const chapterId = last?.id || currentChapter?.id;
            if (!chapterId) throw new Error("챕터 정보가 없습니다.");
            const resp = await fetch("/api/submit-mission", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ chapterId, isCorrect: true, photoUrls: [url] }),
            });
            if (!resp.ok) throw new Error(await resp.text());
            setToast("마이페이지에 저장되었습니다.");
            setGalleryUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
        } catch (e) {
            setToast("저장 중 오류가 발생했습니다.");
        }
    };

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
            // chapterId는 placeOption.id(= selectedPlaceId)를 사용해야 엔딩 조회와 정확히 매칭됩니다.
            let submissionPayload: any = { chapterId: Number(selectedPlaceId ?? currentChapter.id), isCorrect: true };
            try {
                console.log("[DEBUG-0] submit start", {
                    missionType,
                    canProceed,
                    isSubmitting,
                    photoFilesLen: Array.isArray(photoFiles) ? photoFiles.length : null,
                });
            } catch {}

            if (missionType === "PHOTO") {
                if (photoFiles.length < 2) throw new Error("사진 2장을 업로드해 주세요.");

                setToast("사진을 압축하고 있어요...");
                const options = { maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true };
                // Blob -> File 변환하여 filename/content-type 누락 방지
                const compressedFiles = await Promise.all(
                    photoFiles.map(async (orig, idx) => {
                        const blob = await imageCompression(orig, options);
                        const ext = (orig.type?.split("/")[1] || "jpg").toLowerCase();
                        const safeName = orig.name || `photo_${idx + 1}.${ext}`;
                        return new File([blob], safeName, { type: "image/jpeg" });
                    })
                );

                const formData = new FormData();
                compressedFiles.forEach((f) => formData.append("photos", f, f.name));
                try {
                    console.log(
                        "[Upload] files",
                        compressedFiles.map((f) => ({ name: f.name, type: f.type, size: f.size }))
                    );
                    console.log("[photoFiles]", photoFiles);
                    for (const [key, value] of (formData as any).entries()) {
                        const v: any = value as any;
                        console.log("FormData entry:", key, v?.name || v);
                    }
                } catch {}

                setToast("사진을 업로드하는 중...");
                try {
                    console.log("[DEBUG-1] Upload start", formData);
                } catch {}
                const uploadResponse = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                    credentials: "include",
                    cache: "no-store",
                });
                try {
                    console.log("[DEBUG-2] Upload response status:", uploadResponse.status);
                } catch {}

                if (!uploadResponse.ok) {
                    const errText = await uploadResponse.text().catch(() => "(no response)");
                    throw new Error(`업로드 실패: ${errText}`);
                }

                // 응답 파싱: JSON 실패 시 raw text로 재시도
                let uploadResult: any = null;
                let rawText: string | null = null;
                try {
                    uploadResult = await uploadResponse.json();
                } catch (e) {
                    try {
                        rawText = await uploadResponse.text();
                        uploadResult = JSON.parse(rawText);
                    } catch {
                        throw new Error(`업로드 응답 파싱 실패: ${String(rawText || "(empty)").slice(0, 200)}`);
                    }
                }
                try {
                    console.log("[DEBUG-3] UploadResult:", uploadResult);
                } catch {}
                // snake_case 또는 camelCase 모두 지원
                let urls = (uploadResult as any)?.photo_urls || (uploadResult as any)?.photoUrls;
                try {
                    console.log("[urls]", urls);
                } catch {}
                if (!urls || urls.length === 0) {
                    // 업로드 응답 파싱 실패 시 직전 성공값으로 폴백
                    urls = Array.isArray(lastUploadedUrls) && lastUploadedUrls.length > 0 ? lastUploadedUrls : [];
                    try {
                        console.warn("[WARN] urls empty, fallback to lastUploadedUrls:", urls);
                    } catch {}
                    if (!urls || urls.length === 0) {
                        throw new Error("업로드된 사진 URL을 받지 못했습니다.");
                    }
                }
                // ✅ camelCase로 통일하여 서버에 전송
                submissionPayload.photoUrls = urls;
                try {
                    console.log("[DEBUG-4] submissionPayload:", submissionPayload);
                } catch {}
                if (Array.isArray(urls)) setLastUploadedUrls(urls);

                // 요청하신 인라인 저장 호출 추가
                if (urls.length > 0) {
                    try {
                        const res = await fetch("/api/submit-mission", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            keepalive: true,
                            body: JSON.stringify({
                                chapterId: Number(selectedPlaceId ?? currentChapter?.id),
                                isCorrect: true,
                                photoUrls: urls,
                            }),
                        });
                        try {
                            console.log("[MissionSubmit] status:", res.status);
                        } catch {}
                        if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            try {
                                console.error("[MissionSubmit] failed:", err);
                            } catch {}
                        }
                    } catch (err) {
                        try {
                            console.error("[MissionSubmit] network error:", err);
                        } catch {}
                        try {
                            const payload = new Blob(
                                [
                                    JSON.stringify({
                                        chapterId: Number(selectedPlaceId ?? currentChapter?.id),
                                        isCorrect: true,
                                        photoUrls: urls,
                                    }),
                                ],
                                { type: "application/json" }
                            );
                            const ok =
                                (navigator as any)?.sendBeacon &&
                                (navigator as any).sendBeacon("/api/submit-mission", payload);
                            if (ok) console.log("[MissionSubmit] sent via sendBeacon");
                        } catch {}
                    }
                }
            } else if (missionType === "PUZZLE_ANSWER") {
                submissionPayload.textAnswer = puzzleAnswer;
            } else {
                try {
                    console.log("[DEBUG-NON-PHOTO] missionType branch:", missionType);
                } catch {}
            }

            setToast("미션 결과 저장 중...");
            try {
                console.log("[DEBUG-5] Before submit-mission fetch, payload:", submissionPayload);
            } catch {}
            const submitResponse = await fetch("/api/submit-mission", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
                credentials: "include",
                body: JSON.stringify(submissionPayload),
            });
            const submitResult = await submitResponse.json().catch(() => ({}));
            try {
                console.log("[DEBUG-6] submit-mission status:", submitResponse.status);
                console.log("[DEBUG-7] submit-mission result:", submitResult);
            } catch {}
            if (!submitResponse.ok) {
                throw new Error(submitResult?.message || "미션 결과 저장에 실패했습니다.");
            }

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
                // 미션 완료 시: 다음 카테고리로 즉시 전환
                setPiecesCollected((n) => n + 1);
                setPendingNextChapterIdx(nextIdx);
                // 완료 카테고리 반영은 서버 저장 성공 이후(현재 시점)에서만 처리
                try {
                    // 선택된 장소의 카테고리를 완료 처리하여 해당 카테고리만 비활성화
                    const place = (currentChapter?.placeOptions || []).find(
                        (p: any) => Number(p.id) === Number(selectedPlaceId)
                    );
                    const catKey = normalizeCategory((place as any)?.category || (place as any)?.type || "");
                    if (catKey) {
                        setCompletedCategories((prev) => {
                            const next = Array.from(new Set([...(prev || []), catKey]));
                            try {
                                const raw = localStorage.getItem(STORAGE_KEY);
                                const obj = raw ? JSON.parse(raw) : {};
                                obj.__completedCategories = next;
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
                            } catch {}
                            return next;
                        });
                    }
                } catch {}
                // ✅ 다음 카테고리로 이동하되, 미션 완료 상태는 유지
                setMissionUnlocked(false);
                setSelectedPlaceId(null);
                setSelectedPlaceIndex(null);
                setSelectedPlaceConfirm(null);
                setCurrentChapterIdx(nextIdx);
                setDialogueStep(0);
                setSelectedCategory(null);
                setFlowStep("category");
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

    // ✨ 다음 카테고리 선택 화면으로 이동 (서버 제출 없이 UI 전환)
    const advanceToNextCategory = () => {
        if (isSubmitting) return;

        try {
            const firstPlace: any = (currentChapter as any)?.placeOptions?.[0] || null;
            const categoryKey = normalizeCategory(firstPlace?.category || firstPlace?.type || "");
            if (categoryKey) {
                setCompletedCategories((prev) => {
                    const updated = Array.from(new Set([...(prev || []), categoryKey]));
                    try {
                        const raw = localStorage.getItem(STORAGE_KEY);
                        const obj = raw ? JSON.parse(raw) : {};
                        obj.__completedCategories = updated;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
                    } catch {}
                    return updated;
                });
            }
        } catch {}

        setPiecesCollected((n) => n + 1);

        const nextIdx = currentChapterIdx + 1;
        if (nextIdx < chapters.length) {
            setCurrentChapterIdx(nextIdx);
        } else {
            // 모든 카테고리를 완료한 경우: 즉시 엔딩 플로우 시작
            if (endingFlowStarted) {
                setFlowStep("done");
                // 이미 시작된 경우라도 엔딩 스텝이 비어 있으면 기본 갤러리로 설정
                setEndingStep((prev) => (prev ? prev : "gallery"));
                return;
            }
            setEndingFlowStarted(true);
            setIsEndFlip(true);
            setFlowStep("done");
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
                setEndingStep("gallery");
            }, 800);
            return;
        }

        setMissionUnlocked(false);
        setSelectedPlaceId(null);
        setSelectedPlaceIndex(null);
        setSelectedPlaceConfirm(null);
        setClearedMissions({});
        setSolvedMissionIds([]);
        setDialogueStep(0);
        setSelectedCategory(null);
        setFlowStep("category");
        try {
            // 이후에는 편지를 다시 보이지 않도록 플래그 유지
            localStorage.setItem(`escape_letter_shown_${storyId}`, "1");
            setIsLetterOpened(true);
        } catch {}
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

            // 초기 진입에서는 완료 카테고리를 복원하지 않는다. (미션 완료 시점에만 세팅)
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
        // 처음 진입 시에는 편지만 뜨도록, 챕터 번호와 무관하게 '열림 여부'만으로 게이트 판단
        const letterGateActive = !isLetterOpened;
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
                            {inMission ? (
                                <button
                                    onClick={() => setShowMapModal(true)}
                                    className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white text-gray-900 shadow"
                                >
                                    지도 보기
                                </button>
                            ) : null}
                            {/* 편지 종료 후, 카테고리 화면에서만 표시 */}
                            {flowStep === "category" && !inMission && (
                                <button
                                    onClick={() => setShowIntroModal(true)}
                                    className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white text-gray-900 shadow"
                                >
                                    대화 보기
                                </button>
                            )}
                        </div>
                    ) : null}

                    <div
                        className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-transform duration-[1400ms] ease-in-out ${
                            flowStep === "walk" ? "translate-y-[-40px]" : "translate-y-0"
                        }`}
                    >
                        {/* 좌: 대화 영역 */}
                        <div className={`space-y-3 ${letterGateActive ? "hidden" : "block"}`}>
                            {/* 초기 대화(프로로그) 섹션은 숨김 처리 */}

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
                                                    // 이미 미션 중이면 리스트로 회귀하지 않도록 가드
                                                    setFlowStep(inMission ? "mission" : "placeList");
                                                }}
                                                className="px-4 py-3 rounded-xl bg-white/85 hover:bg-white text-gray-900 shadow"
                                            >
                                                {cat.label}
                                            </button>
                                        ));
                                    })()}
                                </div>
                            )}

                            {flowStep === "placeList" && selectedCategory && !inMission && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <button
                                            onClick={() => {
                                                // 카테고리 선택 화면으로 복귀
                                                setSelectedCategory(null);
                                                setSelectedPlaceId(null);
                                                setSelectedPlaceIndex(null);
                                                setSelectedPlaceConfirm(null);
                                                setMissionUnlocked(false);
                                                setInSelectedRange(false);
                                                setFlowStep("category");
                                            }}
                                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/85 hover:bg-white text-gray-900 border shadow"
                                        >
                                            ← 카테고리로
                                        </button>
                                    </div>
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
                                                    // 첫 클릭: 상세(주소/시그니처)만 보여주고 선택 대기 + 현재 거리 계산
                                                    if (selectedPlaceConfirm !== p.id) {
                                                        setSelectedPlaceConfirm(p.id);
                                                        setSelectedPlaceIndex(idx);
                                                        setSelectedPlaceId(Number(p.id) || null);
                                                        setSelectedPlaceType(
                                                            (p.type || p.category || "").toString() || null
                                                        );
                                                        setInSelectedRange(false);
                                                        setMissionUnlocked(false);
                                                        try {
                                                            if (
                                                                userLocation &&
                                                                Number.isFinite(Number(p.latitude)) &&
                                                                Number.isFinite(Number(p.longitude))
                                                            ) {
                                                                const km = distanceKm(
                                                                    Number(userLocation.lat),
                                                                    Number(userLocation.lng),
                                                                    Number(p.latitude),
                                                                    Number(p.longitude)
                                                                );
                                                                if (Number.isFinite(km)) setSelectedDistance(km);
                                                                else setSelectedDistance(null);
                                                            } else {
                                                                setSelectedDistance(null);
                                                            }
                                                        } catch {
                                                            setSelectedDistance(null);
                                                        }
                                                        return;
                                                    }
                                                    // 두번째 클릭: 해당 장소로 확정 → 이동 화면 → 도착 후 대화/미션
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

                                                    // 이동 화면 표시 후 상태 전환
                                                    setIsMoving(true);
                                                    setTimeout(() => {
                                                        setIsMoving(false);
                                                        if (lines.length === 0) {
                                                            // 대화가 없더라도 바로 미션 목록을 볼 수 있게 활성화
                                                            setDialogueQueue([]);
                                                            setMissionUnlocked(true);
                                                            setFlowStep("mission");
                                                            return;
                                                        }
                                                        // 대화를 먼저 보여주고, 미션은 대화 종료 시점에 활성화
                                                        setDialogueQueue(lines);
                                                        setFlowStep("dialogue");
                                                        setMissionUnlocked(false);
                                                    }, 1500);
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
                                                        {/* ✅ 거리 표시 추가 */}
                                                        {selectedDistance != null && (
                                                            <div className="text-[11px] text-gray-500">
                                                                📍 현재 위치에서 약{" "}
                                                                <span className="font-medium text-gray-800">
                                                                    {selectedDistance < 1
                                                                        ? `${Math.round(selectedDistance * 1000)}m`
                                                                        : `${selectedDistance.toFixed(1)}km`}
                                                                </span>{" "}
                                                                거리
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

                            {flowStep === "dialogue" && !inMission && (
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
                                            <div className="text-gray-900 whitespace-pre-wrap break-words">
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
                                            try {
                                                console.log("[PieceAward] click", {
                                                    currentChapterIdx,
                                                    chaptersLen: chapters?.length,
                                                    pendingNextChapterIdx,
                                                });
                                            } catch {}
                                            if (piecesCollected >= 4) {
                                                setEndingFlowStarted(true);
                                                setFlowStep("done");
                                                // 엔딩 데이터 fetch 보강 + 약간의 지연으로 렌더 안정화
                                                setTimeout(async () => {
                                                    try {
                                                        const res = await fetch(
                                                            `/api/escape/submissions?storyId=${storyId}`,
                                                            {
                                                                credentials: "include",
                                                            }
                                                        );
                                                        const data = await res.json();
                                                        if (res.ok && Array.isArray(data?.urls))
                                                            setGalleryUrls(data.urls);
                                                    } catch (err) {
                                                        try {
                                                            console.warn("엔딩 갤러리 데이터 로드 실패:", err);
                                                        } catch {}
                                                    }
                                                    setEndingStep("gallery");
                                                }, 300);
                                            } else {
                                                // 다음 카테고리로 전환
                                                const nextIndex =
                                                    typeof pendingNextChapterIdx === "number"
                                                        ? pendingNextChapterIdx
                                                        : currentChapterIdx + 1 < chapters.length
                                                        ? currentChapterIdx + 1
                                                        : null;

                                                if (nextIndex === null) {
                                                    setFlowStep("done");
                                                    return;
                                                }

                                                // 다음 카테고리 즉시 적용
                                                setCurrentChapterIdx(nextIndex);
                                                setDialogueStep(0);
                                                setSelectedCategory(null);
                                                setSelectedPlaceIndex(null);
                                                // ✅ 다음 카테고리로 이동하되, 미션 완료 상태는 유지
                                                setSelectedPlaceId(null);
                                                setSelectedPlaceConfirm(null);
                                                setMissionUnlocked(false);
                                                setFlowStep("category");
                                                try {
                                                    console.log("[PieceAward] moved to", { nextIndex });
                                                } catch {}
                                                setPendingNextChapterIdx(null);
                                            }
                                        }}
                                    >
                                        {piecesCollected >= 4 ? "엔딩 보기" : "다음 장소로 이동"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 우: 미션/엔딩 갤러리 */}
                        {endingStep === "gallery" && flowStep === "done" ? (
                            <div className="rounded-2xl bg-white/85 backdrop-blur p-4 border shadow">
                                <h3 className="text-lg font-bold text-gray-800 mb-3">엔딩 갤러리 (최대 4장 선택)</h3>
                                {galleryUrls.length === 0 ? (
                                    <div className="text-gray-600">표시할 사진이 없습니다.</div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {galleryUrls.map((url) => {
                                            const sel = selectedGallery.includes(url);
                                            return (
                                                <button
                                                    key={url}
                                                    onClick={() => handleToggleSelectPhoto(url)}
                                                    className={`relative rounded overflow-hidden border ${
                                                        sel ? "ring-2 ring-amber-500" : ""
                                                    }`}
                                                >
                                                    <img src={url} alt="photo" className="w-full h-24 object-cover" />
                                                    {sel && (
                                                        <span className="absolute top-1 right-1 text-xs bg-amber-600 text-white px-1 rounded">
                                                            선택됨
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleDownloadCollage}
                                        disabled={selectedGallery.length !== 4}
                                        className="px-4 py-2 rounded-lg bg-amber-600 text-white disabled:opacity-50"
                                    >
                                        콜라주 이미지 다운로드
                                    </button>
                                    <button
                                        onClick={() => setEndingStep("badge")}
                                        disabled={selectedGallery.length !== 4}
                                        className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                                    >
                                        콜라주 확정 → 배지로
                                    </button>
                                    <button
                                        onClick={handleShareToInstagram}
                                        disabled={selectedGallery.length !== 4}
                                        className="px-4 py-2 rounded-lg bg-pink-600 text-white disabled:opacity-50"
                                    >
                                        인스타 스토리 올리기
                                    </button>
                                    <button
                                        onClick={handleSaveToMyPage}
                                        disabled={selectedGallery.length !== 4}
                                        className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                                    >
                                        마이페이지에 저장
                                    </button>
                                    <span className="text-xs text-gray-600">4장을 선택하면 다운로드할 수 있어요.</span>
                                </div>
                            </div>
                        ) : selectedPlaceId && missionUnlocked ? (
                            <div
                                className={`rounded-2xl bg-white/85 backdrop-blur p-4 border shadow transition-opacity duration-500 ${
                                    flowStep === "walk" || letterGateActive ? "opacity-0" : "opacity-100"
                                } ${noteOpenAnim && flowStep === "mission" ? "animate-[noteOpen_300ms_ease-out]" : ""}`}
                            >
                                <h3 className="text-lg font-bold text-gray-800 mb-3">스토리 조각</h3>
                                {/* 모든 미션을 고정 크기 2열 카드로 표시, 클릭 시 모달로 풀이 */}
                                <div className="grid grid-cols-2 gap-2">
                                    {(() => {
                                        const placeList = (currentChapter as any)?.placeOptions || [];
                                        const placeById = selectedPlaceId
                                            ? placeList.find((p: any) => Number(p.id) === Number(selectedPlaceId))
                                            : null;
                                        const placeByIndex =
                                            placeById ||
                                            (selectedPlaceIndex != null
                                                ? placeList[selectedPlaceIndex as number]
                                                : null);
                                        const missions: any[] = Array.isArray((placeByIndex as any)?.missions)
                                            ? (placeByIndex as any).missions
                                            : [];
                                        if (missions.length === 0) {
                                            return (
                                                <div className="col-span-2 text-base text-gray-900 font-medium text-center">
                                                    진행 가능한 미션이 없습니다.
                                                </div>
                                            );
                                        }

                                        return missions
                                            .slice()
                                            .sort(
                                                (a: any, b: any) =>
                                                    Number(a.order || a.missionNumber || 0) -
                                                    Number(b.order || b.missionNumber || 0)
                                            )
                                            .map((m: any, mi: number) => {
                                                const payload = m?.missionPayload || {};
                                                const done =
                                                    !!clearedMissions[Number(m.id)] ||
                                                    solvedMissionIds.includes(Number(m.id));
                                                return (
                                                    <button
                                                        key={m.id ?? mi}
                                                        onClick={() => {
                                                            // 미션마다 사진/답변 상태를 초기화하여 간섭 방지
                                                            setPhotoFiles([]);
                                                            setPhotoPreviewUrl(null);
                                                            setPhotoPreviewUrls([]);
                                                            setPhotoUploaded(false);
                                                            setModalAnswer("");
                                                            setModalError(null);
                                                            setActiveMission(m);
                                                            setMissionModalOpen(true);
                                                        }}
                                                        className={`rounded-lg border bg-white/95 hover:bg-white text-left p-3 h-28 overflow-hidden ${
                                                            done ? "opacity-60" : ""
                                                        }`}
                                                    >
                                                        <div className="font-semibold text-gray-800 mb-1 line-clamp-2">
                                                            {payload.description ||
                                                                payload.question ||
                                                                `스토리 조각 ${mi + 1}`}
                                                        </div>
                                                        {done ? (
                                                            <div className="text-xs text-emerald-600">✅ 완료됨</div>
                                                        ) : (
                                                            <div className="text-xs text-gray-500">클릭하여 진행</div>
                                                        )}
                                                    </button>
                                                );
                                            });
                                    })()}
                                </div>
                                <div className="mt-4 flex justify-center">
                                    <button
                                        onClick={advanceToNextCategory}
                                        className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
                                        disabled={!canProceed || isSubmitting}
                                    >
                                        {isSubmitting
                                            ? "처리 중..."
                                            : solvedMissionIds.length >= 2
                                            ? currentChapterIdx + 1 >= chapters.length
                                                ? "엔딩 보기"
                                                : "다음 카테고리로 →"
                                            : `스토리 조각 ${Math.max(0, 2 - solvedMissionIds.length)}개 더 완료 필요`}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* 기존 대화형 인트로 오버레이 재사용 (유일한 위치에서만 렌더) */}
                {isDialogueActive && currentChapter && !inMission && (
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
                            {isMoving && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                                    <div className="text-4xl mb-3">🚗</div>
                                    <div className="text-gray-800 font-semibold">이동 중...</div>
                                </div>
                            )}
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
                                        <h4 className="text-lg font-bold text-gray-800">스토리 조각</h4>
                                        <div className="text-gray-900">
                                            {payload.description || payload.question || "스토리 조각"}
                                        </div>
                                        {payload.description && (
                                            <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                                {payload.question}
                                            </div>
                                        )}
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
                                                            // ✅ 완료 시에는 description을 추가로 보여주지 않음 (요청사항)
                                                            const queue = placeQueue;
                                                            // ✅ 완료 미션 집계
                                                            if (activeMission?.id != null) {
                                                                setSolvedMissionIds((prev) =>
                                                                    Array.from(
                                                                        new Set([...prev, Number(activeMission.id)])
                                                                    )
                                                                );
                                                                setClearedMissions((prev) => ({
                                                                    ...prev,
                                                                    [Number(activeMission.id)]: true,
                                                                }));
                                                            }

                                                            // ✅ 완료된 장소의 카테고리를 비활성화 목록에 반영
                                                            try {
                                                                const catKey = normalizeCategory(
                                                                    (place as any)?.category ||
                                                                        (place as any)?.type ||
                                                                        ""
                                                                );
                                                                if (catKey) {
                                                                    setCompletedCategories((prev) => {
                                                                        const next = Array.from(
                                                                            new Set([...(prev || []), catKey])
                                                                        );
                                                                        const raw = localStorage.getItem(STORAGE_KEY);
                                                                        const obj = raw ? JSON.parse(raw) : {};
                                                                        obj.__completedCategories = next;
                                                                        localStorage.setItem(
                                                                            STORAGE_KEY,
                                                                            JSON.stringify(obj)
                                                                        );
                                                                        return next;
                                                                    });
                                                                }
                                                            } catch {}

                                                            // ✅ 편지 게이트가 다시 열리지 않도록 강제 고정
                                                            try {
                                                                localStorage.setItem(
                                                                    `escape_letter_shown_${storyId}`,
                                                                    "1"
                                                                );
                                                                setIsLetterOpened(true);
                                                            } catch {}

                                                            if (queue.length > 0) {
                                                                setPostStoryQueue(queue);
                                                                setPostStoryIdx(0);
                                                                setShowPostStory(true);
                                                                return;
                                                            }
                                                        } catch {}
                                                        // 장소 스토리가 없으면 기존 흐름으로 바로 진행
                                                        alert("goToNextChapter click");
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
                                        {t === "TEXT" && (
                                            <div className="space-y-2">
                                                <textarea
                                                    value={modalAnswer}
                                                    onChange={(e) => {
                                                        setModalAnswer(e.target.value);
                                                        setModalError(null);
                                                    }}
                                                    placeholder="내용을 입력하세요"
                                                    className="w-full min-h-[90px] px-3 py-2 rounded border text-gray-900"
                                                />
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={async () => {
                                                            const text = (modalAnswer || "").trim();
                                                            if (!text) {
                                                                setModalError("내용을 입력해 주세요.");
                                                                return;
                                                            }
                                                            try {
                                                                // 서버 저장
                                                                await fetch("/api/submit-mission", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    credentials: "include",
                                                                    body: JSON.stringify({
                                                                        chapterId: Number(
                                                                            selectedPlaceId ?? currentChapter?.id
                                                                        ),
                                                                        isCorrect: true,
                                                                        textAnswer: text,
                                                                    }),
                                                                });

                                                                setMissionModalOpen(false);
                                                                // 완료 처리 공통 로직
                                                                try {
                                                                    const place = (
                                                                        currentChapter?.placeOptions || []
                                                                    ).find(
                                                                        (p: any) =>
                                                                            Number(p.id) === Number(selectedPlaceId)
                                                                    );
                                                                    const placeQueue: string[] = Array.isArray(
                                                                        (place as any)?.stories
                                                                    )
                                                                        ? (place as any).stories
                                                                              .map((s: any) =>
                                                                                  String(
                                                                                      s?.dialogue ||
                                                                                          s?.narration ||
                                                                                          s ||
                                                                                          ""
                                                                                  ).trim()
                                                                              )
                                                                              .filter(Boolean)
                                                                        : [];
                                                                    const queue = placeQueue;
                                                                    if (activeMission?.id != null) {
                                                                        setSolvedMissionIds((prev) =>
                                                                            Array.from(
                                                                                new Set([
                                                                                    ...prev,
                                                                                    Number(activeMission.id),
                                                                                ])
                                                                            )
                                                                        );
                                                                        setClearedMissions((prev) => ({
                                                                            ...prev,
                                                                            [Number(activeMission.id)]: true,
                                                                        }));
                                                                    }
                                                                    // ✅ 완료된 장소의 카테고리를 비활성화 목록에 반영
                                                                    try {
                                                                        const catKey = normalizeCategory(
                                                                            (place as any)?.category ||
                                                                                (place as any)?.type ||
                                                                                ""
                                                                        );
                                                                        if (catKey) {
                                                                            setCompletedCategories((prev) => {
                                                                                const next = Array.from(
                                                                                    new Set([...(prev || []), catKey])
                                                                                );
                                                                                const raw =
                                                                                    localStorage.getItem(STORAGE_KEY);
                                                                                const obj = raw ? JSON.parse(raw) : {};
                                                                                obj.__completedCategories = next;
                                                                                localStorage.setItem(
                                                                                    STORAGE_KEY,
                                                                                    JSON.stringify(obj)
                                                                                );
                                                                                return next;
                                                                            });
                                                                        }
                                                                    } catch {}

                                                                    // ✅ 편지 게이트가 다시 열리지 않도록 강제 고정
                                                                    try {
                                                                        localStorage.setItem(
                                                                            `escape_letter_shown_${storyId}`,
                                                                            "1"
                                                                        );
                                                                        setIsLetterOpened(true);
                                                                    } catch {}
                                                                    if (queue.length > 0) {
                                                                        setPostStoryQueue(queue);
                                                                        setPostStoryIdx(0);
                                                                        setShowPostStory(true);
                                                                        return;
                                                                    }
                                                                } catch {}
                                                                goToNextChapter();
                                                            } catch (err) {
                                                                setModalError("저장 중 오류가 발생했어요.");
                                                            }
                                                        }}
                                                        className="px-3 py-2 rounded text-sm text-white bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        제출
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {modalError && <div className="text-sm text-red-600">{modalError}</div>}
                                        {t === "PHOTO" && (
                                            <div className="flex flex-col gap-2">
                                                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white cursor-pointer hover:bg-gray-50 w-fit">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const files = Array.from(e.target.files || []);
                                                            if (files.length > 0) {
                                                                setPhotoFiles(files.slice(0, 5));
                                                                try {
                                                                    const urls = files
                                                                        .slice(0, 5)
                                                                        .map((f) => URL.createObjectURL(f));
                                                                    setPhotoPreviewUrl(urls[0] || null);
                                                                    setPhotoPreviewUrls(urls);
                                                                } catch {}
                                                                const enough = files.length >= 2;
                                                                // 업로드 표시는 하지 않고, 확인 시 업로드하도록 변경
                                                                setPhotoUploaded(false);
                                                                setValidationError(
                                                                    enough ? "" : "사진 2장을 업로드해 주세요."
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    <span>사진 업로드 (2장)</span>
                                                </label>
                                                {photoPreviewUrls && photoPreviewUrls.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {photoPreviewUrls.map((u, i) => (
                                                            <div
                                                                key={i}
                                                                className="w-16 h-16 rounded-md overflow-hidden border"
                                                            >
                                                                <img
                                                                    src={u}
                                                                    alt={`미리보기-${i + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const files = photoFiles;
                                                            if (!files || files.length < 2) {
                                                                setValidationError("사진 2장을 업로드해 주세요.");
                                                                return;
                                                            }
                                                            setToast("사진을 압축하고 있어요...");
                                                            // 병렬 압축(웹워커) + 품질 최적화로 속도 개선
                                                            const options = {
                                                                maxSizeMB: 1.2,
                                                                maxWidthOrHeight: 1600,
                                                                useWebWorker: true,
                                                                initialQuality: 0.8,
                                                            } as any;
                                                            const compressedFiles = await Promise.all(
                                                                files.map((file) => imageCompression(file, options))
                                                            );

                                                            const formData = new FormData();
                                                            compressedFiles.forEach((file) =>
                                                                formData.append("photos", file, file.name)
                                                            );

                                                            setToast("사진을 업로드하는 중...");
                                                            const uploadResponse = await fetch("/api/upload", {
                                                                method: "POST",
                                                                body: formData,
                                                                cache: "no-store",
                                                            });
                                                            if (!uploadResponse.ok)
                                                                throw new Error(await uploadResponse.text());
                                                            const uploadResult = await uploadResponse.json();
                                                            const urls = Array.isArray(uploadResult.photo_urls)
                                                                ? uploadResult.photo_urls
                                                                : [];
                                                            setLastUploadedUrls(urls);
                                                            setPhotoUploaded(true);

                                                            // 업로드 성공 처리: 미션 해결 처리 로직 실행
                                                            setMissionModalOpen(false);
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
                                                            // 완료 시에는 description 메시지 생략
                                                            const queue = placeQueue;
                                                            if (activeMission?.id != null) {
                                                                setSolvedMissionIds((prev) =>
                                                                    Array.from(
                                                                        new Set([...prev, Number(activeMission.id)])
                                                                    )
                                                                );
                                                                setClearedMissions((prev) => ({
                                                                    ...prev,
                                                                    [Number(activeMission.id)]: true,
                                                                }));
                                                            }
                                                            if (queue.length > 0) {
                                                                setPostStoryQueue(queue);
                                                                setPostStoryIdx(0);
                                                                setShowPostStory(true);
                                                            }
                                                        } catch (err) {
                                                            setValidationError(
                                                                "업로드 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요."
                                                            );
                                                        }
                                                    }}
                                                    className="px-3 py-2 rounded text-sm text-white bg-blue-600 hover:bg-blue-700"
                                                >
                                                    확인
                                                </button>
                                            </div>
                                        )}
                                        {/* 힌트 표시 제거 요청에 따라 숨김 */}
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
                            <div className="text-gray-900 whitespace-pre-wrap break-words min-h-[4em]">
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
