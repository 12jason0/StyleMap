"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";
import dynamicImport from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";

// --- 타입 정의 ---
type Story = {
    id: number;
    title: string;
    synopsis: string;
    imageUrl?: string | null;
    epilogue_text?: any; // 에필로그 타입 추가
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

    // --- ✅ 수정된 부분: 엔딩 단계를 관리하는 상태 ---
    const [endingStep, setEndingStep] = useState<"finalMessage" | "epilogue" | "gallery" | "badge" | null>(null);

    // --- 사진 미션 관련 상태 ---
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [photoUploaded, setPhotoUploaded] = useState<boolean>(false);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
    const [lastUploadedUrls, setLastUploadedUrls] = useState<string[]>([]);

    // --- 사용자 현재 위치 ---
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

    // --- 지오펜스 알림: 사용자가 챕터 위치/기지점 반경 진입 시 알림 ---
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
                    body: JSON.stringify({ storyId, lat: userLocation.lat, lng: userLocation.lng, radius: 150 }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data?.inRange && data?.started) {
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

        // 10초마다 폴링
        timer = setInterval(poll, 10000);
        // 즉시 한 번 실행
        poll();
        return () => clearInterval(timer);
    }, [storyId, userLocation]);

    // --- 지도 컴포넌트 동적 로딩 ---
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

    // 모바일 판단 및 모달 상태
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

    // --- Effect Hooks ---
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
          ]
        : [];

    // 현재 위치와 해당 챕터 장소만 연결
    const mapPlaces = userLocation
        ? [{ id: -1, name: "현재 위치", latitude: userLocation.lat, longitude: userLocation.lng }, ...currentPlace]
        : currentPlace;

    useEffect(() => {
        if (animationFinished && mountMapAfterOpen && currentChapter && chapters.length > 0) {
            const t = setTimeout(() => setShowIntroModal(true), 80);
            return () => clearTimeout(t);
        }
    }, [animationFinished, mountMapAfterOpen, currentChapter, chapters.length]);

    // --- ✅ 수정된 부분: handleCloseBook 상태 정리 ---
    const handleCloseBook = () => {
        setEndingStep(null); // 엔딩 단계 초기화
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

    // --- ✅ 수정된 부분: goToNextChapter 엔딩 처리 로직 변경 ---
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
            // ... (미션 제출 로직은 동일)
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

            // ... (로컬 스토리지 저장 로직은 동일)
            const raw = localStorage.getItem(STORAGE_KEY);
            const obj = raw ? JSON.parse(raw) : {};
            obj[String(currentChapter.chapter_number)] = {
                ...obj[String(currentChapter.chapter_number)],
                completed: true,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));

            const nextIdx = currentChapterIdx + 1;
            if (nextIdx < chapters.length) {
                setCurrentChapterIdx(nextIdx);
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

                    // 첫 번째 엔딩 단계인 '마무리'로 설정
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
        if (currentChapterIdx > 0) setCurrentChapterIdx((prev) => prev - 1);
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

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="fixed inset-0 bg-[aliceblue] flex items-center justify-center pl-0 sm:pl-[12vw] md:pl-[24vw]">
            <style>
                {/* 스타일(CSS) 코드는 이전과 동일하게 유지 */}
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
                    {/* ... 표지, 왼쪽/오른쪽 페이지, 애니메이션 페이지 등은 이전과 동일 ... */}
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
                                {" "}
                                <div className="relative mb-4 border-b-2 pb-3">
                                    {" "}
                                    <div className="flex items-center justify-center gap-3">
                                        {" "}
                                        {currentChapter.chapter_number === 1 && (
                                            <button
                                                onClick={() => router.push("/escape")}
                                                className="hover:cursor-pointer px-3 py-1.5 text-sm rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow"
                                            >
                                                {" "}
                                                escape로 이동{" "}
                                            </button>
                                        )}{" "}
                                        <h2 className="text-xl font-bold text-gray-900">
                                            {" "}
                                            Chapter {currentChapter.chapter_number}. {currentChapter.title || "스토리"}{" "}
                                        </h2>{" "}
                                    </div>{" "}
                                </div>{" "}
                                <div className="relative flex-1 rounded-lg overflow-hidden border-2 border-gray-300 shadow-md mb-4 min-h-[260px]">
                                    {" "}
                                    <NaverMap
                                        places={mapPlaces as any}
                                        userLocation={userLocation as any}
                                        selectedPlace={null}
                                        onPlaceClick={() => {}}
                                        className="w-full h-full"
                                        drawPath={mapPlaces.length >= 2}
                                        routeMode={isMobile ? "walking" : "driving"}
                                    />{" "}
                                </div>{" "}
                                <div className="bg-gray-50 p-4 rounded border">
                                    {" "}
                                    <h3 className="text-lg font-bold mb-2 text-gray-800 flex items-center gap-2">
                                        {" "}
                                        📍 위치{" "}
                                    </h3>{" "}
                                    <p className="text-base text-gray-900">
                                        {" "}
                                        <strong>{currentChapter.location_name || "위치 정보"}</strong> <br />{" "}
                                        {currentChapter.address || "주소 정보 없음"}{" "}
                                    </p>{" "}
                                </div>{" "}
                                {currentChapterIdx > 0 && (
                                    <button
                                        onClick={goToPrevChapter}
                                        className="hover:cursor-pointer mt-4 self-start px-4 py-2 text-base rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow font-medium"
                                    >
                                        {" "}
                                        ← 이전 챕터{" "}
                                    </button>
                                )}{" "}
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
                                {" "}
                                <h2 className="text-xl font-bold mb-4 text-center text-gray-900 border-b-2 pb-3">
                                    {" "}
                                    🎯 미션{" "}
                                </h2>{" "}
                                <div className="flex justify-end gap-2 -mt-2 mb-2">
                                    {" "}
                                    <button
                                        onClick={() => setShowIntroModal(true)}
                                        className="hover:cursor-pointer px-3 py-1.5 text-sm rounded-lg bg-amber-700 text-white hover:bg-amber-800 transition-colors shadow"
                                    >
                                        {" "}
                                        이야기 보기{" "}
                                    </button>{" "}
                                    {isMobile && (
                                        <button
                                            onClick={() => setShowMapModal(true)}
                                            className="hover:cursor-pointer px-3 py-1.5 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow"
                                        >
                                            {" "}
                                            지도 보기{" "}
                                        </button>
                                    )}{" "}
                                </div>{" "}
                                <div className="flex-1 min-h-0 flex flex-col">
                                    {" "}
                                    <h3 className="text-lg font-bold mb-2 text-gray-800">❓ 질문</h3>{" "}
                                    <div className="flex-1 bg-blue-50 rounded p-4 border-2 border-blue-200 overflow-auto">
                                        {" "}
                                        <div className="text-lg font-semibold text-blue-900 mb-3 break-words">
                                            {" "}
                                            {currentChapter.mission_payload?.question || "질문이 없습니다."}{" "}
                                        </div>{" "}
                                        {String(currentChapter.mission_type || "").toUpperCase() === "PUZZLE_ANSWER" ? (
                                            <div className="space-y-3">
                                                {" "}
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
                                                />{" "}
                                                <div className="flex justify-end">
                                                    {" "}
                                                    <button
                                                        onClick={handleCheckAnswer}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors hover:cursor-pointer ${
                                                            answerChecked
                                                                ? "bg-green-600 text-white hover:bg-green-700"
                                                                : "bg-blue-600 text-white hover:bg-blue-700"
                                                        }`}
                                                    >
                                                        {" "}
                                                        {answerChecked ? "정답 확인됨" : "정답"}{" "}
                                                    </button>{" "}
                                                </div>{" "}
                                            </div>
                                        ) : String(currentChapter.mission_type || "").toUpperCase() === "PHOTO" ? (
                                            <div className="space-y-3">
                                                {" "}
                                                {!photoUploaded ? (
                                                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-blue-300 bg-white cursor-pointer hover:bg-blue-50">
                                                        {" "}
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
                                                        />{" "}
                                                        <span className="text-blue-800 text-sm">사진 업로드 (2장)</span>{" "}
                                                    </label>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        {" "}
                                                        {photoPreviewUrl && (
                                                            <img
                                                                src={photoPreviewUrl}
                                                                alt="preview"
                                                                className="w-20 h-20 object-cover rounded border"
                                                            />
                                                        )}{" "}
                                                        <button
                                                            className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 text-sm"
                                                            onClick={() => {
                                                                setPhotoPreviewUrl(null);
                                                                setPhotoUploaded(false);
                                                                setPhotoFiles([]);
                                                            }}
                                                        >
                                                            {" "}
                                                            다시 선택{" "}
                                                        </button>{" "}
                                                    </div>
                                                )}{" "}
                                                {photoFiles.length > 0 && photoFiles.length < 2 && (
                                                    <div className="text-xs text-red-600">
                                                        {" "}
                                                        사진 2장을 업로드해 주세요.{" "}
                                                    </div>
                                                )}{" "}
                                            </div>
                                        ) : currentChapter.mission_payload?.options ? (
                                            <div className="space-y-2">
                                                {" "}
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
                                                            className={`bg-white p-2 rounded border transition-colors cursor-pointer ${
                                                                selectedOptionIndex === index
                                                                    ? "border-blue-600 bg-blue-50"
                                                                    : "border-blue-300 hover:bg-blue-100"
                                                            }`}
                                                        >
                                                            {" "}
                                                            <span className="font-medium text-blue-800">
                                                                {" "}
                                                                {index + 1}. {option}{" "}
                                                            </span>{" "}
                                                        </div>
                                                    )
                                                )}{" "}
                                            </div>
                                        ) : null}{" "}
                                    </div>{" "}
                                </div>{" "}
                                <div className="mt-4 flex justify-between items-center">
                                    {" "}
                                    <span className="text-sm text-red-600 h-5">{validationError}</span>{" "}
                                    {currentChapterIdx < chapters.length - 1 ? (
                                        <button
                                            onClick={goToNextChapter}
                                            className="hover:cursor-pointer px-4 py-2 text-base rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors shadow font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!canProceed || isSubmitting}
                                        >
                                            {" "}
                                            {isSubmitting ? "처리 중..." : "다음 챕터 →"}{" "}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={goToNextChapter}
                                            className="hover:cursor-pointer px-4 py-2 text-base rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow font-medium"
                                            disabled={!canProceed || isSubmitting}
                                        >
                                            {" "}
                                            마무리{" "}
                                        </button>
                                    )}{" "}
                                </div>{" "}
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

                {/* ... 각종 모달들 (인트로, 지도)은 이전과 동일 ... */}
                {showIntroModal && currentChapter && (
                    <div
                        className="fixed inset-0 z-[1400] bg-black/50 flex items-center justify-center p-4"
                        role="dialog"
                        aria-modal="true"
                    >
                        {" "}
                        <div className="relative w-full max-w-md sm:max-w-lg bg-[#f6efe1] rounded-2xl border-2 border-[#a0743a] shadow-2xl overflow-hidden">
                            {" "}
                            <div
                                className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-80"
                                style={{
                                    backgroundImage:
                                        "radial-gradient(120% 60% at 0% 0%, rgba(120, 84, 40, .10), transparent 55%), radial-gradient(120% 60% at 100% 0%, rgba(120, 84, 40, .10), transparent 55%), radial-gradient(120% 60% at 0% 100%, rgba(120, 84, 40, .10), transparent 55%), radial-gradient(120% 60% at 100% 100%, rgba(120, 84, 40, .10), transparent 55%)",
                                }}
                            />{" "}
                            <div className="relative p-5 sm:p-6">
                                {" "}
                                <div className="flex items-center justify-between mb-3">
                                    {" "}
                                    <div className="text-[#3f2d20] font-extrabold tracking-wide">Story Intro</div>{" "}
                                    <button
                                        onClick={() => setShowIntroModal(false)}
                                        className="hover:cursor-pointer px-3 py-1.5 text-xs rounded bg-[#3f2d20] text-[#f6efe1] hover:opacity-90"
                                    >
                                        {" "}
                                        시작하기{" "}
                                    </button>{" "}
                                </div>{" "}
                                <div className="bg-white/70 border border-[#c9a678] rounded-xl p-4 text-[#2b2117] whitespace-pre-wrap max-h-[56vh] overflow-auto">
                                    {" "}
                                    {currentChapter.story_text || "이야기 내용이 없습니다."}{" "}
                                </div>{" "}
                            </div>{" "}
                        </div>{" "}
                    </div>
                )}
                {isMobile && showMapModal && (
                    <div
                        className="fixed inset-0 z-[1400] bg-black/50 flex items-center justify-center p-4"
                        role="dialog"
                        aria-modal="true"
                    >
                        {" "}
                        <div className="bg-white rounded-2xl w-full max-w-md h-[78vh] overflow-hidden relative">
                            {" "}
                            <div className="absolute top-3 right-3 z-10">
                                {" "}
                                <button
                                    onClick={() => setShowMapModal(false)}
                                    className="hover:cursor-pointer px-3 py-1.5 text-sm rounded-lg bg-black/80 text-white"
                                >
                                    {" "}
                                    닫기{" "}
                                </button>{" "}
                            </div>{" "}
                            <div className="w-full h-full min-h-[420px]">
                                {" "}
                                <NaverMap
                                    places={mapPlaces as any}
                                    userLocation={userLocation as any}
                                    selectedPlace={null}
                                    onPlaceClick={() => {}}
                                    className="w-full h-full"
                                    drawPath={mapPlaces.length >= 2}
                                    routeMode={isMobile ? "walking" : "driving"}
                                />{" "}
                            </div>{" "}
                        </div>{" "}
                    </div>
                )}

                {/* --- ✅ 수정된 부분: 단계별 엔딩 오버레이 --- */}
                {animationFinished && endingStep && (
                    <div className="absolute inset-0 z-[1200] pointer-events-auto flex items-center justify-center p-4 bg-black/50 animate-fade-in">
                        {/* 마무리 */}
                        {endingStep === "finalMessage" && (
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl border shadow-lg w-full max-w-2xl h-auto max-h-[90vh] flex flex-col p-6">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">📖 마무리</h2>
                                <div className="flex-1 overflow-y-auto mb-6">
                                    <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                                        {chapters[chapters.length - 1]?.story_text ||
                                            story?.synopsis ||
                                            "여정을 함께해 주셔서 감사합니다."}
                                    </p>
                                </div>
                                <div className="flex justify-end">
                                    <button className="btn-vintage" onClick={() => setEndingStep("epilogue")}>
                                        에필로그 보기
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 에필로그 */}
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
                                            } catch {
                                                /* Invalid URL */
                                            }
                                            return null;
                                        };

                                        const renderContent = (content: any): React.ReactNode => {
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
                                            if (typeof content === "object" && content !== null) {
                                                if (content.videoUrl) return renderContent(content.videoUrl);
                                                if (content.text) return renderContent(content.text);
                                            }
                                            return <p className="text-gray-500">에필로그 내용을 표시할 수 없습니다.</p>;
                                        };

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

                        {/* 추억 액자 */}
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
                                                    {/* 왼쪽 상단 프레임 */}
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
                                                    {/* 오른쪽 하단 프레임 */}
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

                        {/* 뱃지 */}
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
