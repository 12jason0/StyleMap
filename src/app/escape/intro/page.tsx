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
        const t1 = setTimeout(() => setArrived(true), 40);
        const t2 = setTimeout(() => setOpened(true), 700);
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
                                            <div key={i} className="flex justify-center">
                                                <div className="px-3 py-1.5 rounded-full bg-gray-200 text-gray-800 text-sm shadow-sm">
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
                                            try {
                                                if (typeof onLetterOpened === "function") onLetterOpened(false);
                                            } catch {}
                                            // 닫기를 눌러야만 진행되도록: 모달 닫고 부모 UI 표시
                                            setShowLetter(false);
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
            <div className="fixed inset-0 z-[1400] bg-black/60 flex items-end justify-center p-4 animate-fade-in">
                <div className="w-full max-w-3xl bg-white/90 backdrop-blur-md rounded-t-2xl p-4 shadow-lg border-t">
                    <div className="max-h-[46vh] overflow-y-auto space-y-3 pr-1">
                        {parts.map((t, i) => (
                            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                                <div
                                    className={`${
                                        i % 2 === 0 ? "bg-gray-100 text-gray-900" : "bg-blue-600 text-white"
                                    } px-4 py-2 rounded-2xl max-w-[80%] shadow`}
                                >
                                    <p className="whitespace-pre-wrap leading-relaxed">{t}</p>
                                </div>
                            </div>
                        ))}
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
    const [dialogueStep, setDialogueStep] = useState<number>(0);

    // 새 흐름 상태 (책 펼침 제거 UI)
    const [flowStep, setFlowStep] = useState<
        "prologue" | "category" | "placeList" | "dialogue" | "mission" | "pieceAward" | "walk" | "done"
    >("prologue");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedPlaceIndex, setSelectedPlaceIndex] = useState<number | null>(null);
    const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
    const [selectedPlaceType, setSelectedPlaceType] = useState<string | null>(null);
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
            try {
                if (typeof window === "undefined" || !("Notification" in window)) return;
                if (Notification.permission === "default") {
                    await Notification.requestPermission();
                }
            } catch {}
        }

        async function poll() {
            try {
                if (!storyId || !userLocation) return;
                await ensurePermission();
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
                        if (
                            typeof window !== "undefined" &&
                            "Notification" in window &&
                            Notification.permission === "granted"
                        ) {
                            new Notification("기지점에 도착했습니다!", { body: "미션을 시작해보세요." });
                        }
                        setToast("기지점 반경에 도착했습니다. 미션을 시작해보세요!");
                        lastNotifiedStation = true;
                    } else if (nearest?.type === "chapter" && nearest?.id && lastNotifiedChapterId !== nearest.id) {
                        if (
                            typeof window !== "undefined" &&
                            "Notification" in window &&
                            Notification.permission === "granted"
                        ) {
                            new Notification("다음 장소에 도착!", { body: "챕터 미션을 진행하세요." });
                        }
                        setToast("장소 반경에 도착했습니다. 챕터 미션을 진행하세요!");
                        lastNotifiedChapterId = nearest.id;
                    }
                }
            } catch {}
        }
        timer = setInterval(poll, 10000);
        poll();
        return () => clearInterval(timer);
    }, [storyId, userLocation]);

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
                setIsDialogueActive(true);
            }, 80);
            return () => clearTimeout(t);
        }
    }, [animationFinished, mountMapAfterOpen, currentChapter, chapters.length]);

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
    }, [currentChapterIdx, chapters, STORAGE_KEY]);

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
        } catch {}
        setResumed(true);
    }, [chapters, STORAGE_KEY, resumed]);

    // 카테고리 매칭 유틸: 다양한 표기를 하나의 키로 정규화
    const normalizeCategory = (raw: unknown): string => {
        const s = String(raw || "")
            .toLowerCase()
            .replace(/\s+/g, "");
        if (["cafe", "카페", "카페투어"].includes(s)) return "cafe";
        if (["restaurant", "food", "맛집", "음식점", "식사", "다이닝", "dining", "레스토랑"].includes(s))
            return "restaurant";
        if (["date", "walk", "산책", "데이트"].includes(s)) return "date"; // '산책'을 'date' 탭과 묶음
        if (["dinner"].includes(s)) return "restaurant"; // 저녁/다이닝은 음식점과 동일 그룹 처리
        return s;
    };

    const matchesSelectedCategory = (place: any, sel: string | null): boolean => {
        if (!sel) return true;
        const normalizedSel = normalizeCategory(sel);
        const placeCat = normalizeCategory(place?.category || place?.type || "");
        if (!placeCat) return true; // 분류 없음 → 모두 표시
        if (normalizedSel === placeCat) return true;
        // 보조 매칭: restaurant ↔ dinner/dining
        if (
            (normalizedSel === "restaurant" && ["dinner", "dining", "레스토랑"].includes(placeCat)) ||
            (normalizedSel === "date" && ["walk"].includes(placeCat))
        )
            return true;
        return false;
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
                                    {[
                                        { key: "cafe", label: "☕ 카페" },
                                        { key: "date", label: "🌳 산책" },
                                        { key: "restaurant", label: "🍱 식사" },
                                        { key: "dinner", label: "🍷 다이닝" },
                                    ].map((cat) => (
                                        <button
                                            key={cat.key}
                                            onClick={() => {
                                                setSelectedCategory(cat.key);
                                                setSelectedPlaceId(null);
                                                setInSelectedRange(false);
                                                setFlowStep("placeList");
                                            }}
                                            className="px-4 py-3 rounded-xl bg-white/85 hover:bg-white text-gray-900 shadow"
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {flowStep === "placeList" && selectedCategory && (
                                <div className="space-y-2">
                                    {(currentChapter.placeOptions || [])
                                        .filter((p: any) => matchesSelectedCategory(p, selectedCategory))
                                        .map((p: any, idx: number) => (
                                            <div
                                                key={p.id}
                                                className="p-3 rounded-xl bg-white/85 hover:bg-white border shadow cursor-pointer"
                                                onClick={() => {
                                                    const placeType = (p.type || p.category || "").toString();
                                                    setSelectedPlaceType(placeType || null);
                                                    const lines: Array<{ speaker?: string | null; text: string }> =
                                                        Array.isArray(p.stories) && p.stories.length > 0
                                                            ? p.stories.map((s: any) => ({
                                                                  speaker: s.speaker,
                                                                  text: s.dialogue || s.narration || "",
                                                              }))
                                                            : [{ text: `${p.name}에 도착했어요.` }];
                                                    setSelectedPlaceIndex(idx);
                                                    setSelectedPlaceId(Number(p.id) || null);
                                                    setInSelectedRange(false);
                                                    setDialogueQueue(lines);
                                                    setFlowStep("dialogue");
                                                }}
                                            >
                                                <div className="font-semibold text-gray-900">{p.name}</div>
                                                {p.address && (
                                                    <div className="text-xs text-gray-600 mt-0.5">{p.address}</div>
                                                )}
                                            </div>
                                        ))}
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

                        {/* 우: 미션 카드 - 선택 장소 반경 내에 도착한 경우에만 표시 */}
                        {selectedPlaceId && inSelectedRange ? (
                            <div
                                className={`rounded-2xl bg-white/85 backdrop-blur p-4 border shadow transition-opacity duration-500 ${
                                    flowStep === "walk" || letterGateActive ? "opacity-0" : "opacity-100"
                                } ${noteOpenAnim && flowStep === "mission" ? "animate-[noteOpen_300ms_ease-out]" : ""}`}
                            >
                                <h3 className="text-lg font-bold text-gray-800 mb-3">미션</h3>
                                <div className="space-y-3">
                                    <div className="text-base text-gray-900 font-medium text-center">
                                        {currentChapter.mission_payload?.question || "질문이 없습니다."}
                                    </div>
                                    {String(currentChapter.mission_type || "").toUpperCase() === "PUZZLE_ANSWER" && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={puzzleAnswer}
                                                onChange={(e) => {
                                                    setPuzzleAnswer(e.target.value);
                                                    setAnswerChecked(false);
                                                }}
                                                placeholder="정답 입력"
                                                className="flex-1 px-3 py-2 rounded border"
                                            />
                                            <button
                                                onClick={handleCheckAnswer}
                                                className={`px-3 py-2 rounded text-sm text-white ${
                                                    answerChecked ? "bg-green-600" : "bg-blue-600"
                                                }`}
                                            >
                                                {answerChecked ? "확인됨" : "확인"}
                                            </button>
                                        </div>
                                    )}
                                    {String(currentChapter.mission_type || "").toUpperCase() === "PHOTO" && (
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
                                                        setValidationError(enough ? "" : "사진 2장을 업로드해 주세요.");
                                                    }
                                                }}
                                            />
                                            <span>사진 업로드 (2장)</span>
                                        </label>
                                    )}
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
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[aliceblue] flex items-center justify-center pl-0 sm:pl-[12vw] md:pl-[24vw]">
            <style>
                {`
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap");
                :root { --color-cover: hsl(0, 44%, 42%); --color-cover-text: hsl(40, 64%, 80%); --duration: 5000ms; --initial-delay: 500ms; }
                body { display: flex; height: 100vh; margin: 0; justify-content: center; align-items: center; font-family: "Cormorant Garamond", Garamond, "Times New Roman", Times, serif; font-size: 20px; background-color: aliceblue; }
                .book { width: 88vw; max-width: 520px; aspect-ratio: 2/3; border-radius: 0 24px 24px 0; transform-style: preserve-3d; transform: scale(0.92) rotateX(10deg) rotateZ(0deg); animation: move-book var(--duration) ease-in-out forwards; animation-delay: var(--initial-delay); }
                .book.closing { animation: close-book 1.2s ease-in-out forwards; }
.book.animation-finished { pointer-events: none; }
.book.animation-finished .interactive { pointer-events: auto; }
                .page { position: absolute; width: 100%; height: 100%; background-color: white; background: linear-gradient(to right, rgba(0, 0, 0, 0.05), transparent 10%) white; border: 1px solid rgba(0, 0, 0, 0.2); border-radius: inherit; z-index: calc(var(--pages) - var(--id, 0)); transform: translateZ(calc(var(--id, 0) * -1px)); transform-origin: 0 0; animation: turn-page var(--duration) ease-in-out forwards; --increment: calc(var(--duration) / (var(--pages) * 2)); animation-delay: calc(var(--id, 0) * var(--increment) + var(--initial-delay) * 2); }
                .page.static { animation: none !important; }
.deco { pointer-events: none; }
                .content-flip { transform: rotateY(180deg); backface-visibility: visible; -webkit-backface-visibility: visible; transform-style: preserve-3d; }
                .cover { width: 100%; height: 100%; color: var(--color-cover-text); z-index: var(--pages); padding: 5%; box-sizing: border-box; font-size: clamp(12px, 2.2vh, 36px); background: var(--color-cover); }
                .cover .cover-content { position: relative; display: grid; justify-items: center; align-items: center; grid-auto-rows: 1fr; height: 90%; width: 90%; box-sizing: border-box; margin: 5%; padding: 5%; border: 12px double var(--color-cover-text); text-align: center; overflow: hidden; }
                .cover h1, .cover h2 { font-weight: 300; }
                .cover h1 { text-transform: uppercase; }
                .cover h1, .cover h2 { overflow-wrap: anywhere; word-break: break-word; hyphens: auto; }
                .cover img { width: 50%; filter: sepia(100%) brightness(85%) saturate(550%) hue-rotate(-10deg); }
                .back { background: var(--color-cover); transform: translateZ(calc(var(--pages) * -1px)); animation: none; z-index: 0; }
                @keyframes move-book { from { perspective: 1200px; transform: scale(0.86) rotateX(16deg) rotateZ(0deg); } to { perspective: 2200px; transform: scale(1) rotateX(0deg) rotateZ(0deg); } }
                @keyframes turn-page { from { transform: translateZ(calc(var(--id, 0) * -1px)) rotateY(0); } to { transform: translateZ(calc((var(--pages) - var(--id, 0)) * -1px)) rotateY(-180deg); } }
                @keyframes close-book { from { perspective: 5000px; transform: scale(1) rotateX(0deg) rotateZ(0deg); } to { perspective: 2000px; transform: scale(0.5) rotateX(60deg) rotateZ(30deg); } }
                .book.closing .page { animation: turn-page-close 800ms ease-in forwards; --increment: calc(var(--duration) / (var(--pages) * 2)); animation-delay: calc((var(--pages) - var(--id, 0)) * var(--increment) / 2); }
                .book.closing .page.static { animation: turn-page-close 800ms ease-in forwards; }
                @keyframes turn-page-close { from { transform: translateZ(calc((var(--pages) - var(--id, 0)) * -1px)) rotateY(-180deg); } to { transform: translateZ(calc(var(--id, 0) * -1px)) rotateY(0); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.btn-vintage { background: linear-gradient(180deg, #c27a24 0%, #a55e14 100%); color: #fff; border: 1px solid rgba(60,42,25,.35); border-radius: 10px; padding: 8px 14px; box-shadow: 0 3px 0 rgba(60,42,25,.35); cursor: pointer; }
.btn-vintage:hover { filter: brightness(1.05); }
                `}
            </style>

            <div className="relative flex items-center justify-center">
                <div
                    className={`book${isClosing ? " closing" : ""} ${animationFinished ? "animation-finished" : ""}`}
                    style={{ ["--pages" as any]: String(COUNT_PAGES) } as React.CSSProperties}
                >
                    {/* 표지 */}
                    <div className="cover page">
                        <div className="cover-content">
                            <h1>{story?.title || "Welcome to the Story"}</h1>
                            <img src={story?.imageUrl || " "} alt="cover" />
                            <h2>{story?.synopsis || "An adventure awaits"}</h2>
                        </div>
                    </div>

                    {/* 왼쪽 페이지 (지도) */}
                    <div
                        className="page static interactive"
                        style={{
                            ["--id" as any]: String(COUNT_PAGES - 2),
                            zIndex: 12,
                            background: "white",
                            transform: "rotateY(180deg)",
                            opacity: animationFinished ? 1 : 0,
                        }}
                    >
                        {animationFinished && mountMapAfterOpen && currentChapter && chapters.length > 0 && (
                            <div
                                className="w-full h-full p-6 flex flex-col content-flip"
                                style={{ transformOrigin: "center" }}
                            >
                                <div className="relative mb-4 border-b-2 pb-3">
                                    <div className="flex items-center justify-center gap-3">
                                        {currentChapter.chapter_number === 1 && (
                                            <button
                                                onClick={() => router.push("/escape")}
                                                className="hover:cursor-pointer px-3 py-1.5 text-sm rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow"
                                            >
                                                escape로 이동
                                            </button>
                                        )}
                                        <h2 className="text-xl font-bold text-gray-900">
                                            Chapter {currentChapter.chapter_number}. {currentChapter.title || "스토리"}
                                        </h2>
                                    </div>
                                </div>
                                <div className="relative flex-1 rounded-lg overflow-hidden border-2 border-gray-300 shadow-md mb-4 min-h-[260px]">
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
                                <div className="bg-gray-50 p-4 rounded border">
                                    <h3 className="text-lg font-bold mb-2 text-gray-800 flex items-center gap-2">
                                        📍 위치
                                    </h3>
                                    <p className="text-base text-gray-900">
                                        <strong>{currentChapter.location_name || "위치 정보"}</strong> <br />
                                        {currentChapter.address || "주소 정보 없음"}
                                    </p>
                                </div>
                                {currentChapter.chapter_number === 1 &&
                                    Array.isArray(currentChapter.placeOptions) &&
                                    currentChapter.placeOptions.length > 0 && (
                                        <div className="mt-4">
                                            <h3 className="text-lg font-bold mb-2 text-gray-800 flex items-center gap-2">
                                                🗂️ 선택 가능한 장소
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {currentChapter.placeOptions.map((p) => (
                                                    <div key={p.id} className="card overflow-hidden">
                                                        {p.imageUrl ? (
                                                            <img
                                                                src={p.imageUrl}
                                                                alt={p.name}
                                                                className="w-full h-40 object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-gray-500">
                                                                이미지 없음
                                                            </div>
                                                        )}
                                                        <div className="p-4">
                                                            <div className="font-semibold text-gray-900 truncate">
                                                                {p.name}
                                                            </div>
                                                            {p.address && (
                                                                <div className="text-xs text-gray-500 mt-1 truncate">
                                                                    {p.address}
                                                                </div>
                                                            )}
                                                            {p.description && (
                                                                <div className="text-sm text-gray-700 mt-2 line-clamp-2">
                                                                    {p.description}
                                                                </div>
                                                            )}
                                                            <div className="mt-3 flex justify-end">
                                                                <button
                                                                    className="btn-secondary text-sm"
                                                                    onClick={() => {
                                                                        if (p.latitude != null && p.longitude != null) {
                                                                            setUserLocation(
                                                                                (prev) =>
                                                                                    prev || {
                                                                                        lat: p.latitude as number,
                                                                                        lng: p.longitude as number,
                                                                                    }
                                                                            );
                                                                        }
                                                                        setShowMapModal(true);
                                                                    }}
                                                                >
                                                                    지도 보기
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                {currentChapterIdx > 0 && (
                                    <button
                                        onClick={goToPrevChapter}
                                        className="hover:cursor-pointer mt-4 self-start px-4 py-2 text-base rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow font-medium"
                                    >
                                        ← 이전 챕터
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 오른쪽 페이지 (미션) */}
                    <div
                        className="page static interactive"
                        style={{
                            ["--id" as any]: String(COUNT_PAGES - 1),
                            zIndex: 13,
                            background: "white",
                            opacity: animationFinished ? 1 : 0,
                        }}
                    >
                        {animationFinished && currentChapter && chapters.length > 0 && (
                            <div className="w-full h-full p-6 flex flex-col overflow-hidden">
                                <h2 className="text-xl font-bold mb-4 text-center text-gray-900 border-b-2 pb-3">
                                    🎯 미션
                                </h2>
                                <div className="flex justify-end gap-2 -mt-2 mb-2">
                                    <button
                                        onClick={() => {
                                            setDialogueStep(0);
                                            setIsDialogueActive(true);
                                        }}
                                        className="hover:cursor-pointer px-3 py-1.5 text-sm rounded-lg bg-amber-700 text-white hover:bg-amber-800 transition-colors shadow"
                                    >
                                        이야기 다시 보기
                                    </button>
                                    {isMobile && (
                                        <button
                                            onClick={() => setShowMapModal(true)}
                                            className="hover:cursor-pointer px-3 py-1.5 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow"
                                        >
                                            지도 보기
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 min-h-0 flex flex-col">
                                    <h3 className="text-lg font-bold mb-2 text-gray-800">❓ 질문</h3>
                                    <div className="flex-1 bg-blue-50 rounded p-4 border-2 border-blue-200 overflow-auto">
                                        <div className="text-lg font-semibold text-blue-900 mb-3 break-words">
                                            {currentChapter.mission_payload?.question || "질문이 없습니다."}
                                        </div>
                                        {String(currentChapter.mission_type || "").toUpperCase() === "PUZZLE_ANSWER" ? (
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={puzzleAnswer}
                                                    onChange={(e) => {
                                                        setPuzzleAnswer(e.target.value);
                                                        setAnswerChecked(false);
                                                    }}
                                                    placeholder="정답을 입력하세요"
                                                    className="w-full px-3 py-2 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onTouchStart={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={handleCheckAnswer}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors hover:cursor-pointer ${
                                                            answerChecked
                                                                ? "bg-green-600 text-white hover:bg-green-700"
                                                                : "bg-blue-600 text-white hover:bg-blue-700"
                                                        }`}
                                                    >
                                                        {answerChecked ? "정답 확인됨" : "정답"}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : String(currentChapter.mission_type || "").toUpperCase() === "PHOTO" ? (
                                            <div className="space-y-3">
                                                {!photoUploaded ? (
                                                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-blue-300 bg-white cursor-pointer hover:bg-blue-50">
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
                                                        <span className="text-blue-800 text-sm">사진 업로드 (2장)</span>
                                                    </label>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        {photoPreviewUrl && (
                                                            <img
                                                                src={photoPreviewUrl}
                                                                alt="preview"
                                                                className="w-20 h-20 object-cover rounded border"
                                                            />
                                                        )}
                                                        <button
                                                            className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 text-sm"
                                                            onClick={() => {
                                                                setPhotoPreviewUrl(null);
                                                                setPhotoUploaded(false);
                                                                setPhotoFiles([]);
                                                            }}
                                                        >
                                                            다시 선택
                                                        </button>
                                                    </div>
                                                )}
                                                {photoFiles.length > 0 && photoFiles.length < 2 && (
                                                    <div className="text-xs text-red-600">
                                                        사진 2장을 업로드해 주세요.
                                                    </div>
                                                )}
                                            </div>
                                        ) : currentChapter.mission_payload?.options ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                                {currentChapter.mission_payload.options.map(
                                                    (option: string, index: number) => (
                                                        <div
                                                            key={index}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setSelectedOptionIndex(index)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" || e.key === " ")
                                                                    setSelectedOptionIndex(index);
                                                            }}
                                                            className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer text-gray-800 transform hover:scale-105 ${
                                                                selectedOptionIndex === index
                                                                    ? "border-amber-500 bg-amber-100 shadow-lg ring-2 ring-amber-500"
                                                                    : "border-gray-300 bg-white hover:border-amber-400 hover:bg-amber-50"
                                                            }`}
                                                        >
                                                            <span className="font-semibold">{option}</span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-between items-center">
                                    <span className="text-sm text-red-600 h-5">{validationError}</span>
                                    {currentChapterIdx < chapters.length - 1 ? (
                                        <button
                                            onClick={goToNextChapter}
                                            className="hover:cursor-pointer px-4 py-2 text-base rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors shadow font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!canProceed || isSubmitting}
                                        >
                                            {isSubmitting ? "처리 중..." : "다음 챕터 →"}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={goToNextChapter}
                                            className="hover:cursor-pointer px-4 py-2 text-base rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow font-medium"
                                            disabled={!canProceed || isSubmitting}
                                        >
                                            마무리
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 애니메이션용 중간 페이지들 */}
                    {Array.from({ length: numFlipPages }, (_, i) => (
                        <div
                            key={`mid-${i}`}
                            className="page deco"
                            style={{ ["--id" as any]: String(i + 1) } as React.CSSProperties}
                        />
                    ))}

                    {/* 뒷표지 */}
                    <div className="back page" />
                </div>

                {/* 페이지 인디케이터 */}
                {animationFinished && chapters.length > 0 && (
                    <div className="absolute bottom-6 left-4 md:left-6 z-[1201] pointer-events-auto">
                        <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium">
                            {currentChapterIdx + 1} / {chapters.length}
                        </div>
                    </div>
                )}

                {/* 중복 렌더 제거: 아래 영역에서는 DialogueFlow를 렌더하지 않음 */}

                {isMobile && showMapModal && (
                    <div
                        className="fixed inset-0 z-[1400] bg-black/50 flex items-center justify-center p-4"
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

                {/* 단계별 엔딩 오버레이 */}
                {animationFinished && endingStep && (
                    <div className="absolute inset-0 z-[1200] pointer-events-auto flex items-center justify-center p-4 bg-black/50 animate-fade-in">
                        {endingStep === "finalMessage" && (
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl border shadow-lg w-full max-w-2xl h-auto max-h-[90vh] flex flex-col p-6">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">📖 마무리</h2>
                                <div className="flex-1 overflow-y-auto mb-6">
                                    {/* ✅ --- 오류 수정된 부분 --- */}
                                    <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                                        {((): string => {
                                            const finalText = chapters[chapters.length - 1]?.story_text;
                                            if (typeof finalText === "string") return finalText;
                                            if (Array.isArray(finalText))
                                                return finalText.map((d) => d.text).join("\n\n");
                                            return story?.synopsis || "여정을 함께해 주셔서 감사합니다.";
                                        })()}
                                    </p>
                                    {/* ✅ --- 수정 끝 --- */}
                                </div>
                                <div className="flex justify-end">
                                    <button className="btn-vintage" onClick={() => setEndingStep("epilogue")}>
                                        에필로그 보기
                                    </button>
                                </div>
                            </div>
                        )}

                        {endingStep === "epilogue" && (
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl border shadow-lg w-full max-w-2xl h-auto max-h-[90vh] flex flex-col p-6">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">🎬 에필로그</h2>
                                <div className="flex-1 overflow-y-auto mb-6">
                                    {(() => {
                                        const epi = story?.epilogue_text;
                                        if (!epi)
                                            return <div className="text-base text-gray-700">에필로그가 없습니다.</div>;

                                        const isVideoUrl = (s: string) =>
                                            /\.(mp4|webm|ogg)(\?.*)?$/i.test(s) ||
                                            s.includes("youtube.com") ||
                                            s.includes("youtu.be");
                                        const getYouTubeEmbedUrl = (url: string) => {
                                            try {
                                                const urlObj = new URL(url);
                                                if (urlObj.hostname.includes("youtu.be"))
                                                    return `https://www.youtube.com/embed/${urlObj.pathname.slice(1)}`;
                                                if (urlObj.searchParams.has("v"))
                                                    return `https://www.youtube.com/embed/${urlObj.searchParams.get(
                                                        "v"
                                                    )}`;
                                            } catch {}
                                            return null;
                                        };

                                        {
                                            /* ✅ --- 오류 수정된 부분 --- */
                                        }
                                        const renderContent = (content: any): React.ReactNode => {
                                            if (!content) return null;

                                            if (typeof content === "string") {
                                                const youtubeUrl = getYouTubeEmbedUrl(content);
                                                if (youtubeUrl)
                                                    return (
                                                        <div className="aspect-video w-full">
                                                            <iframe
                                                                src={youtubeUrl}
                                                                className="w-full h-full rounded"
                                                                allow="autoplay; encrypted-media"
                                                                allowFullScreen
                                                                title="Epilogue Video"
                                                            />
                                                        </div>
                                                    );
                                                if (isVideoUrl(content))
                                                    return <video src={content} controls className="w-full rounded" />;
                                                return (
                                                    <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                                                        {content}
                                                    </p>
                                                );
                                            }

                                            if (Array.isArray(content)) {
                                                const textContent = content
                                                    .map((item: any) =>
                                                        typeof item === "object" && item.text ? item.text : String(item)
                                                    )
                                                    .join("\n\n");
                                                return (
                                                    <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                                                        {textContent}
                                                    </p>
                                                );
                                            }

                                            if (typeof content === "object") {
                                                if (content.videoUrl) return renderContent(content.videoUrl);
                                                if (content.text) return renderContent(content.text);
                                            }
                                            return <p className="text-gray-500">에필로그 내용을 표시할 수 없습니다.</p>;
                                        };
                                        {
                                            /* ✅ --- 수정 끝 --- */
                                        }

                                        return renderContent(epi);
                                    })()}
                                </div>
                                <div className="flex justify-end">
                                    <button className="btn-vintage" onClick={() => setEndingStep("gallery")}>
                                        추억 액자 보기
                                    </button>
                                </div>
                            </div>
                        )}

                        {endingStep === "gallery" && (
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl border shadow-lg w-full max-w-4xl h-auto max-h-[90vh] flex flex-col p-6">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">🖼️ 추억 액자</h2>
                                <div className="flex-1 overflow-y-auto mb-6">
                                    {(() => {
                                        const urls = lastUploadedUrls.length > 0 ? lastUploadedUrls : galleryUrls;
                                        if (!urls || urls.length === 0)
                                            return (
                                                <div className="text-sm text-gray-600">업로드된 사진이 없습니다.</div>
                                            );
                                        if (urls.length === 2) {
                                            return (
                                                <div className="relative min-h-[520px] sm:min-h-[600px] overflow-visible">
                                                    <div className="absolute top-2 left-2">
                                                        <div className="bg-[#a5743a] rounded-2xl p-2 shadow-2xl transform rotate-[40deg]">
                                                            <div className="bg-[#f8f5ef] rounded-xl p-2 border-2 border-[#704a23]">
                                                                <img
                                                                    src={urls[0]}
                                                                    alt={`photo-0`}
                                                                    className="w-[150px] h-[200px] sm:w-[300px] sm:h-[300px] object-cover rounded-lg"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute bottom-2 right-2">
                                                        <div className="bg-[#a5743a] rounded-2xl p-2 shadow-2xl transform rotate-[-10deg]">
                                                            <div className="bg-[#f8f5ef] rounded-xl p-2 border-2 border-[#704a23]">
                                                                <img
                                                                    src={urls[1]}
                                                                    alt={`photo-1`}
                                                                    className="w-[150px] h-[200px] sm:w-[300px] sm:h-[300px] object-cover rounded-lg"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                                {urls.map((u, i) => (
                                                    <div
                                                        key={i}
                                                        className="bg-[#a5743a] rounded-2xl p-3 shadow-2xl transform rotate-[-4deg] hover:rotate-0 transition-transform"
                                                    >
                                                        <div className="bg-[#f8f5ef] rounded-xl p-3 border-4 border-[#704a23]">
                                                            <img
                                                                src={u}
                                                                alt={`photo-${i}`}
                                                                className="w-full h-full object-cover rounded aspect-square"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="flex justify-end">
                                    <button className="btn-vintage" onClick={() => setEndingStep("badge")}>
                                        뱃지 보기
                                    </button>
                                </div>
                            </div>
                        )}

                        {endingStep === "badge" && (
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl border shadow-lg w-full max-w-md h-auto max-h-[90vh] flex flex-col p-6 items-center">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">🏅 배지 획득</h2>
                                {badge ? (
                                    <>
                                        {badge.image_url && (
                                            <img
                                                src={badge.image_url}
                                                alt={badge.name || "badge"}
                                                className="w-36 h-36 object-contain my-4"
                                            />
                                        )}
                                        <p className="font-semibold text-lg text-gray-800">
                                            {badge.name || "새로운 배지"}
                                        </p>
                                        {badge.description && (
                                            <p className="text-sm text-gray-700 mt-2 text-center whitespace-pre-wrap">
                                                {badge.description}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-gray-600 my-4">획득한 배지가 없습니다.</p>
                                )}
                                <div className="mt-8 w-full flex justify-end">
                                    <button className="btn-vintage" onClick={handleCloseBook}>
                                        책 덮고 종료
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <EscapeIntroPageInner />
        </Suspense>
    );
}
