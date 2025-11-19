"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEffectOnce } from "react-use";
import Image from "@/components/ImageFallback";
import dynamic from "next/dynamic";

import { Place as MapPlace, UserLocation } from "@/types/map";
import PlaceStatusBadge from "@/components/PlaceStatusBadge";
const ReviewModal = dynamic(() => import("@/components/ReviewModal"), { ssr: false, loading: () => null });
const NaverMap = dynamic(() => import("@/components/NaverMap"), {
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100" />,
});

// --- 타입 정의 ---
interface PlaceClosedDay {
    day_of_week: number | null;
    specific_date: Date | string | null;
    note?: string | null;
}

interface Place {
    id: number;
    name: string;
    address: string;
    description: string;
    category: string;
    avg_cost_range: string;
    opening_hours: string;
    phone?: string;
    website?: string;
    parking_available: boolean;
    reservation_required: boolean;
    latitude: number;
    longitude: number;
    imageUrl?: string; // ✅ snake_case 로 수정
    closed_days?: PlaceClosedDay[];
}

interface CoursePlace {
    id: number;
    course_id: number;
    place_id: number;
    order_index: number;
    estimated_duration: number;
    recommended_time: string;
    notes?: string;
    place: Place;
}

interface Course {
    id: string;
    title: string;
    description: string;
    duration: string;
    price?: string;
    imageUrl: string; // ✅ snake_case 로 수정
    concept: string;
    rating: number;
    isPopular: boolean;
    recommended_start_time: string;
    season: string;
    courseType: string;
    transportation: string;
    reservationRequired: boolean;
    createdAt: string;
    updatedAt: string;
}

interface Highlight {
    id: number;
    icon: string;
    title: string;
    description: string;
}

interface CourseData extends Course {
    highlights?: Highlight[];
    coursePlaces?: CoursePlace[];
}

interface Review {
    id: number;
    rating: number;
    userName: string;
    createdAt: string;
    content: string;
}

// --- 유틸리티 컴포넌트 ---
const Toast = ({
    message,
    type,
    onClose,
}: {
    message: string;
    type: "success" | "error" | "info";
    onClose: () => void;
}) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = { success: "bg-green-500", error: "bg-red-500", info: "bg-blue-500" }[type];

    return (
        <div
            className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in-right`}
        >
            <div className="flex items-center gap-2">
                <span>{message}</span>
                <button onClick={onClose} className="ml-2 text-white hover:text-gray-200">
                    ×
                </button>
            </div>
        </div>
    );
};

const LoadingSpinner = ({ size = "large" }: { size?: "small" | "large" }) => {
    const sizeClasses = size === "large" ? "h-32 w-32" : "h-6 w-6";
    return <div className={`animate-spin rounded-full ${sizeClasses} border-b-2 border-blue-600`} />;
};

const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
    <div className="text-center py-8">
        <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z"
                />
            </svg>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                다시 시도
            </button>
        )}
    </div>
);

// --- 메인 컴포넌트 ---
export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();

    if (!params || !params.id) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600">잘못된 코스 ID입니다.</p>
                    <button
                        onClick={() => router.push("/courses")}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        코스 목록으로 돌아가기
                    </button>
                </div>
            </main>
        );
    }
    const courseId = params.id as string;

    // --- 상태 관리 ---
    const [courseData, setCourseData] = useState<CourseData | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isSaved, setIsSaved] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showPlaceModal, setShowPlaceModal] = useState(false);

    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
    const mapSectionRef = useRef<HTMLDivElement | null>(null);
    // 상세 진입 즉시 view 상호작용 기록
    useEffect(() => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;
            fetch("/api/users/interactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ courseId: Number(courseId), action: "view" }),
            }).catch(() => {});
        } catch {}
    }, [courseId]);

    // --- 메모이제이션 ---
    const sortedCoursePlaces = useMemo(() => {
        if (!courseData?.coursePlaces) return [];
        return [...courseData.coursePlaces].sort((a, b) => a.order_index - b.order_index);
    }, [courseData?.coursePlaces]);

    const heroImageUrl = useMemo(() => {
        if (courseData?.imageUrl) return courseData.imageUrl;
        if (sortedCoursePlaces.length > 0) return sortedCoursePlaces[0].place.imageUrl || undefined;
        return ""; // 빈 값이면 ImageFallback에서 회색 placeholder 표시
    }, [courseData?.imageUrl, sortedCoursePlaces]);

    const totalCost = useMemo(() => courseData?.price || "", [courseData]);

    // --- (이하 fetch, useEffect, 이벤트 핸들러 부분 이어집니다)
    const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
        setToast({ message, type });
    }, []);

    // 길찾기 핸들러
    const createNavigationHandler = useCallback(
        (name: string, lat: number, lng: number) => (e: React.MouseEvent) => {
            e.stopPropagation();
            const url = `https://map.naver.com/v5/search/${encodeURIComponent(name)}?c=${lng},${lat},15,0,0,0,dh`;
            window.open(url, "_blank");
        },
        []
    );

    // 타임라인 장소 클릭 핸들러 (지도만 연동, 모달은 열지 않음)
    const handleTimelinePlaceClick = (coursePlace: CoursePlace) => {
        setSelectedPlace({
            id: coursePlace.place.id,
            name: coursePlace.place.name,
            latitude: coursePlace.place.latitude,
            longitude: coursePlace.place.longitude,
            address: coursePlace.place.address,
            imageUrl: coursePlace.place.imageUrl, // ✅ snake_case
            description: coursePlace.place.description,
        });
        try {
            const el = mapSectionRef.current;
            if (el) {
                const rect = el.getBoundingClientRect();
                const top = (window.scrollY || window.pageYOffset) + rect.top - 80; // 헤더 높이 보정
                window.scrollTo({ top, behavior: "smooth" });
            }
        } catch {}
    };

    // 장소 상세보기 버튼 클릭 (모달 오픈)
    const handlePlaceDetailClick = (coursePlace: CoursePlace, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPlace({
            id: coursePlace.place.id,
            name: coursePlace.place.name,
            latitude: coursePlace.place.latitude,
            longitude: coursePlace.place.longitude,
            address: coursePlace.place.address,
            imageUrl: coursePlace.place.imageUrl,
            description: coursePlace.place.description,
        });
        setShowPlaceModal(true);
    };

    const fetchReviews = useCallback(async () => {
        if (!courseId) return;
        try {
            const response = await fetch(`/api/reviews?courseId=${courseId}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setReviews(
                        data.map((r: any) => ({
                            id: r.id,
                            rating: r.rating,
                            userName: r.user?.nickname || "익명",
                            createdAt: r.createdAt,
                            content: r.comment,
                        }))
                    );
                }
            }
        } catch (error) {
            console.error("후기 목록 업데이트 실패:", error);
        }
    }, [courseId]);

    const handleSaveCourse = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            showToast("로그인이 필요합니다.", "error");
            router.push("/login");
            return;
        }

        const endpoint = `/api/users/favorites`;
        const options: RequestInit = {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        };

        try {
            if (isSaved) {
                options.method = "DELETE";
                const response = await fetch(`${endpoint}?courseId=${courseId}`, options);
                if (!response.ok) throw new Error("찜 해제에 실패했습니다.");
                setIsSaved(false);
                showToast("찜 목록에서 제거했습니다.", "success");
            } else {
                options.method = "POST";
                options.body = JSON.stringify({ courseId });
                const response = await fetch(endpoint, options);
                if (!response.ok) {
                    const errorData = await response.json();
                    if (errorData.error === "Already favorited") {
                        setIsSaved(true);
                        showToast("이미 찜한 코스입니다.", "info");
                    } else {
                        throw new Error("찜 추가에 실패했습니다.");
                    }
                } else {
                    setIsSaved(true);
                    showToast("찜 목록에 추가했습니다.", "success");
                }
            }
            window.dispatchEvent(new CustomEvent("favoritesChanged"));
        } catch (error) {
            showToast(error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.", "error");
        }
    };

    const handleShareCourse = () => {
        setShowShareModal(true);
    };

    const handleKakaoShare = async () => {
        const url = typeof window !== "undefined" ? window.location.href : "";
        try {
            const ensureKakao = () =>
                new Promise<void>((resolve, reject) => {
                    const w = window as any;
                    if (w.Kakao) return resolve();
                    const s = document.createElement("script");
                    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
                    s.async = true;
                    s.onload = () => resolve();
                    s.onerror = () => reject(new Error("Kakao SDK load failed"));
                    document.head.appendChild(s);
                });

            await ensureKakao();
            const w = window as any;
            const Kakao = w.Kakao;
            const jsKey =
                (process.env.NEXT_PUBLIC_KAKAO_JS_KEY as string | undefined) ||
                (process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY as string | undefined) ||
                (process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY as string | undefined);
            if (!Kakao) throw new Error("Kakao SDK not available");
            if (!Kakao.isInitialized()) {
                if (!jsKey) throw new Error("NEXT_PUBLIC_KAKAO_JS_KEY missing");
                Kakao.init(jsKey);
            }

            const shareImage =
                heroImageUrl ||
                courseData?.imageUrl ||
                "https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/logo/donalogo_512.png"; // 유효한 공개 이미지
            const title = courseData?.title || "DoNa 코스";
            const desc = courseData?.description || "DoNa에서 코스를 확인해 보세요";

            Kakao.Share.sendDefault({
                objectType: "feed",
                content: {
                    title,
                    description: desc,
                    imageUrl: shareImage,
                    link: { mobileWebUrl: url, webUrl: url },
                },
                buttons: [
                    {
                        title: "코스 보러가기",
                        link: { mobileWebUrl: url, webUrl: url },
                    },
                ],
            });

            try {
                await navigator.clipboard.writeText(url);
            } catch {}
            setShowShareModal(false);
        } catch (error) {
            console.error("Kakao share error:", error);
            try {
                await navigator.clipboard.writeText(url);
                showToast("링크가 복사되었습니다.", "success");
            } catch {}
        }
    };

    // (제거됨) 인스타/DM 공유 버튼/핸들러

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShowShareModal(false);
            showToast("링크가 클립보드에 복사되었습니다.", "success");
        } catch (error) {
            console.error("Error copying link:", error);
            showToast("링크 복사에 실패했습니다.", "error");
        }
    };

    // --- useEffect 훅 ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [courseRes, reviewsRes] = await Promise.all([
                    fetch(`/api/courses/${courseId}`, { cache: "no-store" }),
                    fetch(`/api/reviews?courseId=${courseId}`),
                ]);

                if (!courseRes.ok) throw new Error("코스 정보를 가져오는데 실패했습니다.");

                const courseData = await courseRes.json();
                setCourseData(courseData);
                document.title = `DoNa | ${courseData.title}`;

                if (reviewsRes.ok) {
                    const reviewsData = await reviewsRes.json();
                    if (Array.isArray(reviewsData)) {
                        setReviews(
                            reviewsData.map((r: any) => ({
                                id: r.id,
                                rating: r.rating,
                                userName: r.user?.nickname || "익명",
                                createdAt: r.createdAt,
                                content: r.comment,
                            }))
                        );
                    }
                } else {
                    console.warn("후기 목록을 가져오지 못했습니다.");
                }

                const token = localStorage.getItem("authToken");
                if (token) {
                    fetch("/api/users/favorites", { headers: { Authorization: `Bearer ${token}` } })
                        .then((res) => (res.ok ? res.json() : []))
                        .then((favorites) => {
                            const isFavorited = favorites.some((fav: any) => fav.course_id.toString() === courseId);
                            setIsSaved(isFavorited);
                        })
                        .catch((err) => console.error("찜 상태 확인 실패:", err));
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [courseId]);

    useEffect(() => {
        const key = `course_view_${courseId}`;
        const now = Date.now();
        const lastView = localStorage.getItem(key);
        if (!lastView || now - parseInt(lastView) > 30 * 60 * 1000) {
            fetch(`/api/courses/${courseId}/view`, { method: "POST" })
                .then(() => {
                    localStorage.setItem(key, String(now));
                })
                .catch((err) => console.error("조회수 증가 API 호출 실패:", err));
        }
    }, [courseId]);
    // 사용자 현재 위치 가져오기
    useEffect(() => {
        if (!navigator.geolocation) return;
        const geoOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 };
        const onOk = (pos: GeolocationPosition) =>
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const onErr = () => showToast("위치 정보를 가져올 수 없습니다.", "info");

        navigator.geolocation.getCurrentPosition(onOk, onErr, geoOptions);
        const watchId = navigator.geolocation.watchPosition(onOk, onErr, geoOptions);
        return () => navigator.geolocation.clearWatch(watchId);
    }, [showToast]);

    // 첫 장소를 기본 선택 장소로 설정
    useEffect(() => {
        if (sortedCoursePlaces.length > 0 && !selectedPlace) {
            const first = sortedCoursePlaces[0];
            setSelectedPlace({
                id: first.place.id,
                name: first.place.name,
                latitude: first.place.latitude,
                longitude: first.place.longitude,
                address: first.place.address,
                imageUrl: first.place.imageUrl, // ✅ snake_case 유지
                description: first.place.description,
            });
        }
    }, [sortedCoursePlaces, selectedPlace]);

    // 후기 작성 완료 시 목록 새로고침
    useEffect(() => {
        const handleReviewSubmitted = () => fetchReviews();
        window.addEventListener("reviewSubmitted", handleReviewSubmitted);
        return () => window.removeEventListener("reviewSubmitted", handleReviewSubmitted);
    }, [fetchReviews]);

    // --- 렌더링 로직 ---
    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner />
                    <p className="mt-4 text-gray-600">코스 정보를 불러오는 중...</p>
                </div>
            </main>
        );
    }

    if (error || !courseData) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <ErrorDisplay
                        error={error || "요청하신 코스가 존재하지 않습니다."}
                        onRetry={() => window.location.reload()}
                    />
                    <button
                        onClick={() => router.push("/courses")}
                        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        코스 목록으로 돌아가기
                    </button>
                </div>
            </main>
        );
    }

    // --- JSX 반환 ---
    return (
        <>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="min-h-screen bg-gray-50 text-black">
                {/* Hero Section */}
                <section className="relative h-[300px] overflow-hidden pt-10">
                    <div className="absolute inset-0">
                        <Image
                            src={heroImageUrl || ""}
                            alt={courseData.title}
                            fill
                            priority
                            sizes="(max-width: 600px) 100vw, 600px"
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                    </div>

                    <div className="relative h-full max-w-[500px] mx-auto px-4 flex items-center">
                        <div className="max-w-[80%]">
                            <div className="mb-4 flex items-center gap-3 flex-wrap">
                                {courseData.isPopular && (
                                    <span className="px-4 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
                                        🔥 인기 코스
                                    </span>
                                )}
                                {courseData.concept && (
                                    <span className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-full">
                                        {courseData.concept}
                                    </span>
                                )}
                                {Array.isArray(
                                    (courseData.courseType || "")
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean)
                                )
                                    ? (courseData.courseType || "")
                                          .split(",")
                                          .map((s) => s.trim())
                                          .filter(Boolean)
                                          .map((t, idx) => (
                                              <span
                                                  key={`ctype-${idx}-${t}`}
                                                  className="px-4 py-1.5 bg-emerald-700 text-white text-sm font-bold rounded-full"
                                              >
                                                  {t}
                                              </span>
                                          ))
                                    : null}
                            </div>

                            <h1 className="text-2xl font-bold text-white mb-4">{courseData.title}</h1>
                            <p
                                className="text-base text-white/90 mb-2"
                                style={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                {courseData.description}
                            </p>

                            <div className="flex items-center gap-4 text-white text-sm flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-400 text-2xl">★</span>
                                    <span className="font-bold">{courseData.rating}</span>
                                </div>
                                <span>📍 {courseData.coursePlaces?.length || 0}개 장소</span>
                                <span>⏱ {courseData.duration}</span>
                                <span className="hidden md:inline">🕒 {courseData.recommended_start_time}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Course Details */}
                <section className="py-10">
                    <div className="max-w-[500px] mx-auto px-4">
                        <div className="grid grid-cols-1 gap-8">
                            {/* Main Content */}
                            <div className="space-y-8">
                                {/* 코스 설명 */}
                                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-8">
                                    <h2 className="text-2xl md:text-3xl font-bold mb-6">코스 소개</h2>
                                    <p className="text-gray-700 leading-relaxed text-base md:text-lg">
                                        {courseData.description}
                                    </p>
                                </div>

                                {/* 코스 특징 */}
                                {courseData.highlights && courseData.highlights.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-8">
                                        <h2 className="text-2xl md:text-3xl font-bold mb-6">코스 특징</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {courseData.highlights.map((highlight) => (
                                                <div
                                                    key={highlight.id}
                                                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:shadow-md transition-shadow"
                                                >
                                                    <span className="text-blue-500 text-2xl">{highlight.icon}</span>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 mb-1">
                                                            {highlight.title}
                                                        </h4>
                                                        <p className="text-gray-600 text-sm">{highlight.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 타임라인 + 지도 섹션 */}
                                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-8">
                                    {/* 지도 섹션 */}
                                    <div className="mb-8 rounded-2xl overflow-hidden shadow-lg" ref={mapSectionRef}>
                                        <div className="relative">
                                            {sortedCoursePlaces.length > 0 ? (
                                                <NaverMap
                                                    places={sortedCoursePlaces.map((cp) => ({
                                                        id: cp.place.id,
                                                        name: cp.place.name,
                                                        latitude: cp.place.latitude,
                                                        longitude: cp.place.longitude,
                                                        address: cp.place.address,
                                                        imageUrl: cp.place.imageUrl, // ✅ snake_case
                                                        description: cp.place.description,
                                                        orderIndex: cp.order_index,
                                                    }))}
                                                    userLocation={null}
                                                    selectedPlace={selectedPlace}
                                                    onPlaceClick={setSelectedPlace}
                                                    drawPath={true}
                                                    numberedMarkers={true}
                                                    routeMode="walking"
                                                    className="w-full h-64 rounded-2xl"
                                                    style={{ minHeight: "260px" }}
                                                    showControls={false}
                                                    showPlaceOverlay={false}
                                                />
                                            ) : (
                                                <div className="w-full h-80 bg-gray-100 rounded-2xl flex items-center justify-center">
                                                    <div className="text-center">
                                                        <div className="text-6xl mb-4">🗺️</div>
                                                        <p className="text-gray-600">등록된 장소가 없습니다</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* 타임라인 */}
                                    <div className="relative pl-6" style={{ willChange: "transform" }}>
                                        <div className="absolute left-4 md:left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-pink-500"></div>

                                        {sortedCoursePlaces.length > 0 ? (
                                            sortedCoursePlaces.map((coursePlace, idx) => {
                                                const isSelected = selectedPlace?.id === coursePlace.place.id;
                                                return (
                                                    <div key={coursePlace.id} className="relative mb-6 md:mb-8">
                                                        {/* 순서 번호 - 선택 시 강조 */}
                                                        <div
                                                            className={`absolute -left-10 md:-left-12 top-4 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg transition-all duration-300 ${
                                                                isSelected
                                                                    ? "bg-blue-600 text-white scale-125 ring-4 ring-blue-200"
                                                                    : "bg-indigo-500 text-white"
                                                            }`}
                                                        >
                                                            {coursePlace.order_index}
                                                        </div>

                                                        {/* 장소 카드 - 선택 시 배경색 변경 */}
                                                        <div
                                                            className={`cursor-pointer rounded-xl p-3 md:p-6 transition-all duration-300 ${
                                                                isSelected
                                                                    ? "bg-blue-50 border-2 border-blue-500 shadow-lg scale-102"
                                                                    : "bg-gray-50 border border-gray-200 hover:shadow-md"
                                                            }`}
                                                            onClick={() => handleTimelinePlaceClick(coursePlace)}
                                                        >
                                                            <div className="flex flex-col sm:flex-row gap-4">
                                                                {/* 좌: 이미지 / 우: 주요 정보 */}
                                                                <div className="w-full sm:w-36 flex-shrink-0">
                                                                    <div className="relative h-32 sm:h-24 bg-gray-200 rounded-lg overflow-hidden">
                                                                        <span className="absolute top-1 right-1 z-10 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                                            {coursePlace.place.category || "기타"}
                                                                        </span>
                                                                        {coursePlace.place.imageUrl ? (
                                                                            <Image
                                                                                src={coursePlace.place.imageUrl}
                                                                                alt={coursePlace.place.name}
                                                                                fill
                                                                                sizes="(max-width: 640px) 100vw, 144px"
                                                                                className="object-cover"
                                                                                priority={idx === 0}
                                                                                quality={60}
                                                                            />
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="text-base md:text-lg font-bold text-gray-800 mb-1">
                                                                        {coursePlace.place.name}
                                                                    </h3>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <div className="flex flex-col items-center leading-none">
                                                                            <span className="text-pink-500">📍</span>
                                                                        </div>
                                                                        <span className="text-sm md:text-base text-gray-700 font-medium line-clamp-1">
                                                                            {coursePlace.place.address}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                        <span className="text-sm text-gray-600">
                                                                            💰 {coursePlace.place.avg_cost_range}
                                                                        </span>
                                                                        <span className="text-sm text-gray-600">
                                                                            ⏱ {coursePlace.estimated_duration}분
                                                                        </span>
                                                                        {coursePlace.place.opening_hours && (
                                                                            <span className="text-xs text-gray-500">
                                                                                🕘 {coursePlace.place.opening_hours}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {/* 영업 상태 배지 */}
                                                                    <div className="mb-2">
                                                                        <PlaceStatusBadge
                                                                            place={coursePlace.place}
                                                                            closedDays={
                                                                                coursePlace.place.closed_days || []
                                                                            }
                                                                            size="sm"
                                                                            showHours={false}
                                                                        />
                                                                    </div>
                                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                                        {/* 상세보기 버튼 */}
                                                                        <button
                                                                            onClick={(e) =>
                                                                                handlePlaceDetailClick(coursePlace, e)
                                                                            }
                                                                            className="cursor-pointer bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-blue-700"
                                                                        >
                                                                            상세보기
                                                                        </button>
                                                                        <button
                                                                            onClick={createNavigationHandler(
                                                                                coursePlace.place.name,
                                                                                coursePlace.place.latitude,
                                                                                coursePlace.place.longitude
                                                                            )}
                                                                            className="hover:cursor-pointer text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                                                            style={{
                                                                                backgroundColor: "var(--brand-green)",
                                                                            }}
                                                                        >
                                                                            길찾기
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {coursePlace.notes && (
                                                                <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                                                    <p className="text-sm text-blue-800">
                                                                        💡 <strong>팁:</strong> {coursePlace.notes}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <div className="text-4xl mb-4">📍</div>
                                                <p>등록된 장소가 없습니다.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 리뷰 섹션 */}
                                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl md:text-3xl font-bold">이용후기</h2>
                                        <button
                                            onClick={() => setShowReviewModal(true)}
                                            className="hover:cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                                        >
                                            후기 작성하기
                                        </button>
                                    </div>

                                    {reviews.length > 0 ? (
                                        <div className="space-y-4">
                                            {reviews.map((review) => (
                                                <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-yellow-400 text-lg">★</span>
                                                            <span className="font-semibold">{review.rating}/5</span>
                                                            <span className="text-gray-500">•</span>
                                                            <span className="text-sm text-gray-600">
                                                                {review.userName}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-700">{review.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <div className="text-6xl mb-4">💬</div>
                                            <p className="text-lg mb-2">아직 등록된 후기가 없어요</p>
                                            <p className="text-sm">
                                                이 코스를 이용해 보시고 첫 번째 후기를 남겨주세요!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div>
                                <div className="sticky top-6 space-y-6">
                                    {/* 코스 액션 카드 */}
                                    <div className="bg-white rounded-2xl shadow-lg p-6">
                                        <h3 className="text-xl font-bold mb-4">{courseData.title}</h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">장소 수</span>
                                                <span className="font-semibold">
                                                    {courseData.coursePlaces?.length || 0}개
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">평점</span>
                                                <div className=" flex items-center gap-1">
                                                    <span className=" text-yellow-400">★</span>
                                                    <span className="font-semibold">{courseData.rating}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">예상 비용</span>
                                                <span className="font-semibold text-lg text-blue-600">{totalCost}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">소요시간</span>
                                                <span className="font-semibold">{courseData.duration}</span>
                                            </div>
                                            <div className="border-t pt-4 space-y-3 ">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/courses/${courseId}/start`)}
                                                    className="hover:cursor-pointer w-full py-3 font-bold rounded-lg transition-all duration-300 transform hover:scale-105 text-white"
                                                    style={{ backgroundColor: "var(--brand-green)" }}
                                                >
                                                    🚀 코스 시작하기
                                                </button>
                                                <button
                                                    onClick={handleSaveCourse}
                                                    className="hover:cursor-pointer w-full py-3 font-bold rounded-lg transition-all duration-300 transform hover:scale-105 text-white"
                                                    style={{
                                                        backgroundColor: isSaved
                                                            ? "var(--brand-green-dark)"
                                                            : "var(--brand-green)",
                                                    }}
                                                    aria-label={isSaved ? "찜 해제하기" : "찜하기"}
                                                >
                                                    {isSaved ? "💖 찜 완료" : "🤍 찜하기"}
                                                </button>
                                                <button
                                                    onClick={handleShareCourse}
                                                    className="hover:cursor-pointer w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    aria-label="코스 공유하기"
                                                >
                                                    📤 공유하기
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 코스 정보 */}
                                    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                                        <h3 className="text-xl font-bold mb-4">코스 정보</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <span className="text-purple-500 text-xl mt-1">👫</span>
                                                <div>
                                                    <p className="font-medium text-gray-800">추천 대상</p>
                                                    <p className="text-sm text-gray-600">{courseData.courseType}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <span className="text-orange-500 text-xl mt-1">🕒</span>
                                                <div>
                                                    <p className="font-medium text-gray-800">추천 시간대</p>
                                                    <p className="text-sm text-gray-600">
                                                        {courseData.recommended_start_time}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <span className="text-green-500 text-xl mt-1">🌸</span>
                                                <div>
                                                    <p className="font-medium text-gray-800">추천 계절</p>
                                                    <p className="text-sm text-gray-600">{courseData.season}</p>
                                                </div>
                                            </div>
                                            {courseData.reservationRequired && (
                                                <div className="flex items-start gap-3">
                                                    <span className="text-red-500 text-xl mt-1">📞</span>
                                                    <div>
                                                        <p className="font-medium text-gray-800">예약 필요</p>
                                                        <p className="text-sm text-gray-600">
                                                            사전 예약이 필요한 코스입니다
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 하단 고정 액션 바 (모바일) */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveCourse}
                            className="flex-1 py-3 font-bold rounded-lg transition-all duration-300 text-white"
                            style={{ backgroundColor: isSaved ? "var(--brand-green-dark)" : "var(--brand-green)" }}
                        >
                            {isSaved ? "💖 찜 완료" : "🤍 찜하기"}
                        </button>
                        <button
                            onClick={handleShareCourse}
                            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg disabled:opacity-50"
                        >
                            📤 공유하기
                        </button>
                    </div>
                </div>
            </div>

            {/* 공유 모달 */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000] p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-800">공유하기</h3>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="hover:cursor-pointer text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-4">
                            <button
                                onClick={handleKakaoShare}
                                className="hover:cursor-pointer w-full flex items-center gap-4 p-4 bg-yellow-400 text-black rounded-xl hover:bg-yellow-500"
                            >
                                <div className="text-2xl">💬</div>
                                <div className="text-left">
                                    <div className="font-bold">카카오톡으로 공유</div>
                                </div>
                            </button>
                            {/* (제거됨) 추가 공유 버튼 */}
                            <button
                                onClick={handleCopyLink}
                                className="hover:cursor-pointer w-full flex items-center gap-4 p-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
                            >
                                <div className="text-2xl">📋</div>
                                <div className="text-left">
                                    <div className="font-bold">링크 복사</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 후기 작성 모달 */}
            <ReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                courseId={parseInt(courseId)}
                courseName={courseData.title}
            />

            {/* JSON-LD 구조화 데이터 */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "TouristTrip",
                        name: courseData.title,
                        description: courseData.description,
                        image: heroImageUrl,
                        itinerary: sortedCoursePlaces.map((cp) => ({
                            "@type": "TouristDestination",
                            name: cp.place.name,
                            description: cp.place.description,
                            address: cp.place.address,
                        })),
                    }),
                }}
            />

            {/* 장소 상세 모달 */}
            {showPlaceModal && selectedPlace && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-[3000] p-4"
                    onClick={() => setShowPlaceModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b">
                            <h3 className="text-xl font-bold text-gray-900">{selectedPlace.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{selectedPlace.address}</p>
                        </div>
                        {selectedPlace.imageUrl ? (
                            <div className="w-full h-64 md:h-96 bg-gray-100 overflow-hidden flex items-center justify-center relative">
                                <Image
                                    src={selectedPlace.imageUrl}
                                    alt={selectedPlace.name}
                                    fill
                                    sizes="100vw"
                                    className="object-contain"
                                    quality={60}
                                />
                            </div>
                        ) : (
                            <div className="w-full h-40 md:h-56 bg-gray-200" />
                        )}
                        <div className="p-4">
                            <p className="text-gray-700 text-sm whitespace-pre-line">
                                {selectedPlace.description || "설명이 없습니다."}
                            </p>
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    className="hover:cursor-pointer px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                    onClick={() => setShowPlaceModal(false)}
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
