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
    const [showStoryModal, setShowStoryModal] = useState<boolean>(false);
    const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null);
    const [nextStoryText, setNextStoryText] = useState<string>("");
    const STORAGE_KEY = useMemo(() => `escape_progress_${storyId}`, [storyId]);
    const [resumed, setResumed] = useState<boolean>(false);
    const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
    const [showEnding, setShowEnding] = useState<boolean>(false);
    const [isEndFlip, setIsEndFlip] = useState<boolean>(false);
    const endingMessage = "모험을 함께해 주셔서 감사합니다! 다음 여행에서 또 만나요.";
    const [badge, setBadge] = useState<{
        id: number;
        name: string;
        description?: string | null;
        image_url?: string | null;
    } | null>(null);
    const [showBadge, setShowBadge] = useState<boolean>(false);
    const [fadeToBlack, setFadeToBlack] = useState<boolean>(false);
    const [endingFlowStarted, setEndingFlowStarted] = useState<boolean>(false);
    const [showFinalMessageInBook, setShowFinalMessageInBook] = useState<boolean>(false);
    const [showGalleryInPage, setShowGalleryInPage] = useState<boolean>(false);
    const [showBadgeInPage, setShowBadgeInPage] = useState<boolean>(false);
    const [toast, setToast] = useState<string | null>(null);

    // --- 수정된 부분: 사진 미션 관련 상태 추가 ---
    const [photoFiles, setPhotoFiles] = useState<File[]>([]); // 업로드할 실제 파일(2장 요구)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // 제출(업로드+DB저장) 중 로딩 상태
    const [photoUploaded, setPhotoUploaded] = useState<boolean>(false); // 사진이 선택되었는지 여부
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null); // 미리보기용 URL
    const [lastUploadedUrls, setLastUploadedUrls] = useState<string[]>([]); // 이번 세션에서 막 업로드한 사진
    // ---
    // 전체 화면 갤러리는 사용하지 않음 (책 페이지 내에서만 표시)

    // --- 사용자 현재 위치(경로 표시용) ---
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
    }, []);

    // --- 지도 컴포넌트 동적 로딩 ---
    const KakaoMap = useMemo(
        () =>
            dynamicImport(() => import("@/components/KakaoMap"), {
                ssr: false,
                loading: () => (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        지도 로딩...
                    </div>
                ),
            }),
        []
    );

    // 책 오픈 애니메이션이 끝난 뒤에 지도 컴포넌트를 마운트하도록 약간 지연
    const [mountMapAfterOpen, setMountMapAfterOpen] = useState<boolean>(false);
    useEffect(() => {
        if (!animationFinished) return;
        const t = setTimeout(() => setMountMapAfterOpen(true), 150);
        return () => clearTimeout(t);
    }, [animationFinished]);

    // 모바일 판단 및 지도 모달 상태
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [showMapModal, setShowMapModal] = useState<boolean>(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia("(max-width: 768px)");
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener?.("change", update);
        return () => mq.removeEventListener?.("change", update);
    }, []);

    // 책이 열린 뒤 모바일이면 지도를 모달로 자동 오픈 (currentChapter 정의 이후에서 다시 설정)

    // --- Effect Hooks ---
    // ✅✅✅ 이 부분이 수정되었습니다 ✅✅✅
    useEffect(() => {
        // document 객체가 존재하는 브라우저 환경인지 확인
        if (typeof document !== "undefined") {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";

            // 컴포넌트가 언마운트될 때 원래 스타일로 복원
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

    // 애니메이션 및 버튼 타이밍 설정
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

    // 경로 표시를 위해 현재 위치를 시작점으로 포함
    const mapPlaces = userLocation
        ? [
              {
                  id: -1,
                  name: "현재 위치",
                  latitude: userLocation.lat,
                  longitude: userLocation.lng,
              },
              ...currentPlace,
          ]
        : currentPlace;

    const numFlipPages = 11;

    // 책이 열린 뒤 모바일이면 지도를 모달로 자동 오픈
    useEffect(() => {
        if (animationFinished && mountMapAfterOpen && isMobile && currentChapter && chapters.length > 0) {
            setShowMapModal(true);
        }
    }, [animationFinished, mountMapAfterOpen, isMobile, currentChapter, chapters.length]);

    const handleCloseBook = () => {
        // 종료 전 모든 엔딩/배지/갤러리 상태 정리
        setShowBadge(false);
        setShowEnding(false);
        setShowGalleryInPage(false);
        setShowFinalMessageInBook(false);
        setFadeToBlack(false);
        setIsClosing(true);
        setTimeout(() => {
            router.push("/");
        }, 1300);
    };

    // 마지막 종료 시, DB에서 사진을 찾아 갤러리를 먼저 보여주고 없으면 바로 종료
    const handleExitWithGallery = async () => {
        try {
            if (!Number.isFinite(storyId)) return handleCloseBook();
            const res = await fetch(`/api/escape/submissions?storyId=${storyId}`, { credentials: "include" });
            const data = await res.json();
            if (res.ok && Array.isArray(data?.urls) && data.urls.length > 0) {
                setGalleryUrls(data.urls);
                return; // 갤러리 모달 표시(조건부 렌더링)
            }
        } catch {}
        handleCloseBook();
    };

    const normalize = (v: any) =>
        String(v ?? "")
            .trim()
            .toLowerCase();

    const canProceed = useMemo(() => {
        if (!currentChapter) return false;
        const payload = currentChapter.mission_payload || {};
        const typeUpper = String(currentChapter.mission_type || "").toUpperCase();
        if (typeUpper === "PUZZLE_ANSWER") {
            const expected = payload?.answer;
            if (expected === undefined || expected === null) {
                return puzzleAnswer.trim().length > 0;
            }
            return normalize(puzzleAnswer) === normalize(expected);
        }
        if (typeUpper === "PHOTO") {
            return photoUploaded === true;
        }
        if (Array.isArray(payload?.options) && payload.options.length > 0) {
            if (selectedOptionIndex === null) return false;
            const ans: any = payload?.answer;
            if (ans === undefined || ans === null) return true;
            if (typeof ans === "number") {
                if (ans >= 1 && ans <= payload.options.length) {
                    return selectedOptionIndex === ans - 1;
                }
                return selectedOptionIndex === ans;
            }
            return normalize(payload.options[selectedOptionIndex]) === normalize(ans);
        }
        return true;
    }, [currentChapter, puzzleAnswer, selectedOptionIndex, photoUploaded]);

    // --- 수정된 부분: goToNextChapter 함수 전체를 API 연동 로직으로 변경 ---
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
            let submissionPayload: any = {
                chapterId: currentChapter.id,
                isCorrect: true,
            };

            if (missionType === "PHOTO") {
                if (photoFiles.length < 2) {
                    throw new Error("사진 2장을 업로드해 주세요.");
                }

                // --- ✨ 여기가 최종 해결책입니다 ✨ ---
                setToast("사진을 압축하고 있어요...");
                const options = {
                    maxSizeMB: 1.5, // 이미지 최대 용량 1.5MB
                    maxWidthOrHeight: 1920, // 최대 해상도 1920px
                    useWebWorker: true, // 웹 워커를 사용해 UI 차단 방지
                };

                // Promise.all을 사용해 여러 이미지를 병렬로 압축합니다.
                const compressedFiles = await Promise.all(photoFiles.map((file) => imageCompression(file, options)));
                console.log("Image compression successful.");
                // --- ✨ 압축 로직 끝 ---

                const formData = new FormData();
                compressedFiles.forEach((file) => {
                    // 압축된 파일을 FormData에 추가합니다.
                    formData.append("photos", file, file.name);
                });

                setToast("사진을 업로드하는 중...");
                const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });

                if (!uploadResponse.ok) {
                    // 서버 응답이 실패했을 경우, 응답 텍스트를 에러 메시지로 사용
                    const errorText = await uploadResponse.text();
                    throw new Error(`업로드 실패: ${errorText}`);
                }

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

            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const obj = raw ? JSON.parse(raw) : {};
                obj[String(currentChapter.chapter_number)] = {
                    ...obj[String(currentChapter.chapter_number)],
                    completed: true,
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
            } catch (e) {
                console.error("로컬 스토리지 저장 실패:", e);
            }

            const nextIdx = currentChapterIdx + 1;
            if (nextIdx < chapters.length) {
                setPendingNextIndex(nextIdx);
                setNextStoryText(chapters[nextIdx]?.story_text || "이야기 내용이 없습니다.");
                setShowStoryModal(true);
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
                    setShowGalleryInPage(true);
                    try {
                        const br = await fetch(`/api/escape/badge?storyId=${storyId}`);
                        const bd = await br.json();
                        if (br.ok && bd?.badge) setBadge(bd.badge);
                        if (br.ok && bd?.badge?.id) {
                            const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
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
                    } catch {}
                }, 800);
            }
        } catch (error: any) {
            console.error("미션 처리 중 에러:", error);
            setValidationError(error.message || "오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            setToast(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const goToPrevChapter = () => {
        if (currentChapterIdx > 0) {
            setCurrentChapterIdx((prev) => prev - 1);
        }
    };

    // 챕터 변경 시 저장된 입력 불러오기
    useEffect(() => {
        if (!currentChapter) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const obj = raw ? JSON.parse(raw) : {};
            const saved = obj[String(currentChapter.chapter_number)] || {};
            setPuzzleAnswer(typeof saved.answer === "string" ? saved.answer : "");
            setSelectedOptionIndex(typeof saved.option === "number" ? saved.option : null);
            setPhotoUploaded(!!saved.photo);
            setPhotoPreviewUrl(null);
            setPhotoFiles([]);
            setValidationError("");
        } catch {
            setPuzzleAnswer("");
            setSelectedOptionIndex(null);
            setPhotoUploaded(false);
            setPhotoPreviewUrl(null);
            setPhotoFiles([]);
        }
    }, [currentChapterIdx, chapters, STORAGE_KEY]);

    // 페이지 이탈 시 현재 진행도 저장
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

    // 앱 재진입 시 마지막으로 완료한 다음 챕터부터 시작
    useEffect(() => {
        if (resumed || chapters.length === 0) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return setResumed(true);
            const obj = JSON.parse(raw) || {};
            const completedNumbers = Object.keys(obj)
                .filter((k) => obj[k]?.completed)
                .map((k) => Number(k))
                .filter((n) => Number.isFinite(n))
                .sort((a, b) => a - b);

            if (completedNumbers.length > 0) {
                const lastCompleted = completedNumbers[completedNumbers.length - 1];
                const nextChapterNumber = lastCompleted + 1;
                const nextChapterIndex = chapters.findIndex((c) => c.chapter_number === nextChapterNumber);

                if (nextChapterIndex !== -1) {
                    setCurrentChapterIdx(nextChapterIndex);
                }
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
    width: 88vw; 
    max-width: 520px;
    aspect-ratio: 2/3;
    border-radius: 0 24px 24px 0; 
    transform-style: preserve-3d; 
    transform: scale(0.92) rotateX(10deg) rotateZ(0deg); 
    animation: move-book var(--duration) ease-in-out forwards; 
    animation-delay: var(--initial-delay); 
}
.book.closing { 
    animation: close-book 1.2s ease-in-out forwards; 
}
.book.animation-finished { pointer-events: none; }
.book.animation-finished .interactive { pointer-events: auto; }
.page { 
    position: absolute; 
    width: 100%; 
    height: 100%; 
    background-color: white; 
    background: linear-gradient(to right, rgba(0, 0, 0, 0.05), transparent 10%) white; 
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
.deco { pointer-events: none; }
  .content-flip {
      transform: rotateY(180deg);
      backface-visibility: visible;
      -webkit-backface-visibility: visible;
      transform-style: preserve-3d;
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
    overflow: hidden;
}
.cover h1, .cover h2 { 
    font-weight: 300; 
}
.cover h1 { 
    text-transform: uppercase; 
}
.cover h1, .cover h2 {
    overflow-wrap: anywhere;
    word-break: break-word;
    hyphens: auto;
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
        perspective: 1200px; 
        transform: scale(0.86) rotateX(16deg) rotateZ(0deg); 
    } 
    to { 
        perspective: 2200px; 
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
/* --- Closing sequence: flip pages back while book moves away --- */
.book.closing .page { 
    animation: turn-page-close 800ms ease-in forwards; 
    --increment: calc(var(--duration) / (var(--pages) * 2));
    /* reverse order so the last pages close first */
    animation-delay: calc((var(--pages) - var(--id, 0)) * var(--increment) / 2);
}
.book.closing .page.static { 
    animation: turn-page-close 800ms ease-in forwards; 
}
@keyframes turn-page-close { 
    from { 
        transform: translateZ(calc((var(--pages) - var(--id, 0)) * -1px)) rotateY(-180deg); 
    } 
    to { 
        transform: translateZ(calc(var(--id, 0) * -1px)) rotateY(0); 
    } 
}
.animate-fade-in-up {
    animation: fade-in-up 0.5s ease-out forwards;
}
@keyframes fade-in-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.parchment-modal { position: fixed; inset: 0; z-index: 1400; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.45); }
.parchment { position: relative; width: min(94vw, 820px); max-height: 82vh; overflow: hidden; border-radius: 18px; padding: 18px 16px 14px 16px; background: radial-gradient(120% 60% at 0% 0%, rgba(120, 84, 40, .18), transparent 55%), radial-gradient(120% 60% at 100% 0%, rgba(120, 84, 40, .18), transparent 55%), radial-gradient(120% 60% at 0% 100%, rgba(120, 84, 40, .18), transparent 55%), radial-gradient(120% 60% at 100% 100%, rgba(120, 84, 40, .18), transparent 55%), linear-gradient(180deg, #f6efe1 0%, #efe5ce 100%); border: 3px solid rgba(105, 73, 37, .35); box-shadow: 0 20px 40px rgba(0,0,0,.35), inset 0 0 80px rgba(60, 42, 25, .25), inset 0 0 8px rgba(255, 255, 255, .35); }
.parchment:before { content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: inherit; background-image: repeating-linear-gradient(0deg, rgba(0,0,0,.025) 0, rgba(0,0,0,.025) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(0,0,0,.02) 0, rgba(0,0,0,.02) 1px, transparent 1px, transparent 3px); mix-blend-mode: multiply; }
.parchment:after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: inset 0 0 120px rgba(0,0,0,.35), inset 0 0 18px rgba(120,80,40,.45); }
.parchment-title { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; color: #3f2d20; letter-spacing: .5px; margin-bottom: 10px; }
.parchment-body { background: rgba(255,255,255,.35); border: 1px solid rgba(124, 92, 55, .35); border-radius: 12px; padding: 12px; color: #2b2117; max-height: 56vh; overflow: auto; }
.parchment-actions { display: flex; justify-content: end; gap: 10px; margin-top: 14px; }
.btn-ghost { background: #fff; border: 1px solid rgba(60,42,25,.35); border-radius: 10px; padding: 8px 14px; cursor: pointer; }
.btn-ghost:hover { background: #faf7f0; }
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
                        {animationFinished &&
                            mountMapAfterOpen &&
                            currentChapter &&
                            chapters.length > 0 &&
                            !isMobile && (
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
                                                Chapter {currentChapter.chapter_number}.{" "}
                                                {currentChapter.title || "스토리"}
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="relative flex-1 rounded-lg overflow-hidden border-2 border-gray-300 shadow-md mb-4">
                                        <KakaoMap
                                            places={mapPlaces as any}
                                            userLocation={userLocation as any}
                                            selectedPlace={null}
                                            onPlaceClick={() => {}}
                                            className="w-full h-full"
                                            drawPath={!!userLocation}
                                            routeMode="driving"
                                        />
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded border">
                                        <h3 className="text-lg font-bold mb-2 text-gray-800 flex items-center gap-2">
                                            📍 위치
                                        </h3>
                                        <p className="text-base text-gray-900">
                                            <strong>{currentChapter.location_name || "위치 정보"}</strong>
                                            <br />
                                            {currentChapter.address || "주소 정보 없음"}
                                        </p>
                                    </div>
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
                                {!showFinalMessageInBook ? (
                                    <>
                                        <h2 className="text-xl font-bold mb-4 text-center text-gray-900 border-b-2 pb-3">
                                            🎯 미션
                                        </h2>
                                        {isMobile && (
                                            <div className="flex justify-end -mt-2 mb-2">
                                                <button
                                                    onClick={() => setShowMapModal(true)}
                                                    className="hover:cursor-pointer px-3 py-1.5 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow"
                                                >
                                                    지도 보기
                                                </button>
                                            </div>
                                        )}
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold mb-2 text-gray-800">📖 이야기</h3>
                                            <div className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded border break-words max-h-56 md:max-h-72 overflow-auto">
                                                {currentChapter.story_text || "이야기 내용이 없습니다."}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-h-0 flex flex-col">
                                            <h3 className="text-lg font-bold mb-2 text-gray-800">❓ 질문</h3>
                                            <div className="flex-1 bg-blue-50 rounded p-4 border-2 border-blue-200 overflow-auto">
                                                <div className="text-lg font-semibold text-blue-900 mb-3 break-words">
                                                    {currentChapter.mission_payload?.question || "질문이 없습니다."}
                                                </div>

                                                {/* --- 수정된 부분: 미션 타입별 UI 렌더링 --- */}
                                                {String(currentChapter.mission_type || "").toUpperCase() ===
                                                "PUZZLE_ANSWER" ? (
                                                    <div className="space-y-3">
                                                        <input
                                                            type="text"
                                                            value={puzzleAnswer}
                                                            onChange={(e) => setPuzzleAnswer(e.target.value)}
                                                            placeholder="정답을 입력하세요"
                                                            className="w-full px-3 py-2 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700"
                                                            onClick={(e) => e.stopPropagation()}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onTouchStart={(e) => e.stopPropagation()}
                                                        />
                                                        {currentChapter.mission_payload?.answer && (
                                                            <div className="text-xs text-blue-900/70 select-none pointer-events-none">
                                                                힌트: 정답은{" "}
                                                                {String(currentChapter.mission_payload.answer).length}자
                                                                입니다.
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : String(currentChapter.mission_type || "").toUpperCase() ===
                                                  "PHOTO" ? (
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
                                                                            const first = files[0];
                                                                            const url = URL.createObjectURL(first);
                                                                            setPhotoPreviewUrl(url);
                                                                            const enough = files.length >= 2;
                                                                            setPhotoUploaded(enough);
                                                                            setValidationError(
                                                                                enough
                                                                                    ? ""
                                                                                    : "사진 2장을 업로드해 주세요."
                                                                            );
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="text-blue-800 text-sm">
                                                                    사진 업로드 (2장)
                                                                </span>
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
                                                        {photoFiles.length < 2 && (
                                                            <div className="text-xs text-red-600 select-none pointer-events-none">
                                                                사진 2장을 업로드해 주세요.
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : currentChapter.mission_payload?.options ? (
                                                    <div className="space-y-2">
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
                                                                    <span className="font-medium text-blue-800">
                                                                        {index + 1}. {option}
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                ) : null}
                                                {/* --- */}
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
                                                    onClick={async () => {
                                                        if (!canProceed || isSubmitting) return;
                                                        await goToNextChapter();
                                                    }}
                                                    className="hover:cursor-pointer px-4 py-2 text-base rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow font-medium"
                                                    disabled={!canProceed || isSubmitting}
                                                >
                                                    마무리
                                                </button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col">
                                        <h2 className="text-xl font-bold mb-4 text-center text-gray-900 border-b-2 pb-3">
                                            📖 마무리
                                        </h2>
                                        <div className="flex-1 bg-white rounded p-4 border">
                                            <div className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                                                {chapters[chapters.length - 1]?.story_text ||
                                                    story?.synopsis ||
                                                    "여정을 함께해 주셔서 감사합니다."}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                className="px-4 py-2 text-base rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow font-medium"
                                                onClick={handleCloseBook}
                                            >
                                                책 덮고 종료
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1201] pointer-events-auto">
                        <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium">
                            {currentChapterIdx + 1} / {chapters.length}
                        </div>
                    </div>
                )}

                {/* 모바일: 지도 모달 */}
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
                            <div className="w-full h-full">
                                <KakaoMap
                                    places={mapPlaces as any}
                                    userLocation={userLocation as any}
                                    selectedPlace={null}
                                    onPlaceClick={() => {}}
                                    className="w-full h-full"
                                    drawPath={!!userLocation}
                                    routeMode="driving"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 엔딩 섹션: 페이지 내부에 사진 액자/마무리/배지 */}
                {animationFinished && chapters.length > 0 && showGalleryInPage && (
                    <div className="absolute inset-0 z-[1200] pointer-events-none">
                        <div className="absolute inset-0 p-4 sm:p-6 pointer-events-auto">
                            <div className="bg-white/90 rounded-xl border shadow p-3 sm:p-4 h-full overflow-auto">
                                <div className="text-lg font-bold mb-3">🖼️ 추억 액자</div>
                                {(() => {
                                    const urls = lastUploadedUrls.length > 0 ? lastUploadedUrls : galleryUrls;
                                    return urls && urls.length > 0 ? (
                                        urls.length === 2 ? (
                                            <div className="grid grid-cols-2 grid-rows-2 gap-4 sm:gap-6 min-h-[260px] sm:min-h-[320px] place-items-center overflow-visible">
                                                <div className="col-start-1 row-start-1">
                                                    <div className="bg-[#a5743a] rounded-xl p-2 shadow-inner transform rotate-[-5deg]">
                                                        <div className="bg-[#f8f5ef] rounded-lg p-2 border-2 border-[#704a23]">
                                                            <img
                                                                src={urls[0]}
                                                                alt={`photo-0`}
                                                                className="w-40 h-40 sm:w-56 sm:h-56 object-cover rounded"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-start-2 row-start-2">
                                                    <div className="bg-[#a5743a] rounded-xl p-2 shadow-inner transform rotate-[5deg]">
                                                        <div className="bg-[#f8f5ef] rounded-lg p-2 border-2 border-[#704a23]">
                                                            <img
                                                                src={urls[1]}
                                                                alt={`photo-1`}
                                                                className="w-40 h-40 sm:w-56 sm:h-56 object-cover rounded"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                                                {urls.map((u, i) => (
                                                    <div key={i} className="bg-[#a5743a] rounded-xl p-2 shadow-inner">
                                                        <div className="bg-[#f8f5ef] rounded-lg p-2 border-2 border-[#704a23]">
                                                            <img
                                                                src={u}
                                                                alt={`photo-${i}`}
                                                                className="w-full h-full object-cover rounded"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-sm text-gray-600">업로드된 사진이 없습니다.</div>
                                    );
                                })()}
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        className="btn-vintage"
                                        onClick={() => {
                                            setShowGalleryInPage(false);
                                            setShowFinalMessageInBook(true);
                                        }}
                                    >
                                        마무리 보기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 배지: 페이지 내부 오른쪽 하단 카드 */}
                {animationFinished && chapters.length > 0 && !showGalleryInPage && showFinalMessageInBook && (
                    <div className="absolute inset-0 z-[1200] pointer-events-none">
                        <div className="absolute right-4 bottom-4 w-[86vw] sm:w-[360px] pointer-events-auto">
                            <div className="bg-white/95 rounded-xl border shadow p-4">
                                <div className="text-base sm:text-lg font-bold mb-2 flex items-center gap-2">
                                    <span>🏅</span>
                                    <span>배지 획득</span>
                                </div>
                                {badge?.image_url && (
                                    <img
                                        src={badge.image_url}
                                        alt={badge?.name || "badge"}
                                        className="w-28 h-28 object-contain mx-auto"
                                    />
                                )}
                                <div className="text-center text-sm sm:text-base font-semibold mt-2">
                                    {badge?.name || "새로운 배지"}
                                </div>
                                {badge?.description && (
                                    <div className="text-center text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                                        {badge.description}
                                    </div>
                                )}
                                <div className="mt-3 flex justify-end">
                                    <button className="btn-vintage" onClick={handleCloseBook}>
                                        책 덮고 종료
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 다음 챕터 모달 */}
                {showStoryModal && (
                    <div className="parchment-modal">
                        <div className="parchment animate-fade-in-up">
                            <div className="parchment-title">
                                <span>🗺️</span>
                                <span>다음 이야기</span>
                            </div>
                            <div className="parchment-body whitespace-pre-wrap">{nextStoryText}</div>
                            <div className="parchment-actions">
                                <button className="btn-ghost" onClick={() => setShowStoryModal(false)}>
                                    닫기
                                </button>
                                <button
                                    className="btn-vintage"
                                    onClick={() => {
                                        setShowStoryModal(false);
                                        if (pendingNextIndex !== null) {
                                            setCurrentChapterIdx(pendingNextIndex);
                                            setPendingNextIndex(null);
                                        }
                                    }}
                                >
                                    다음으로
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* 전체 화면 갤러리 오버레이는 사용하지 않습니다 (책 페이지 내 갤러리만 사용) */}
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
