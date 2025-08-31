"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

import ReviewModal from "@/components/ReviewModal";
import KakaoMap from "@/components/KakaoMap";
import { Place as MapPlace, UserLocation } from "@/types/map";

// 인터페이스 정의
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
    image_url?: string;
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
    price: string;
    imageUrl: string;
    concept: string;
    rating: number;
    isPopular: boolean;
    recommendedTime: string;
    season: string;
    courseType: string;
    transportation: string;
    parking: string;
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

interface Benefit {
    id: number;
    benefit_text: string;
    category: string;
    display_order?: number;
}

interface Notice {
    id: number;
    notice_text: string;
    type?: string;
}

interface CourseData extends Course {
    highlights?: Highlight[];
    benefits?: Benefit[];
    notices?: Notice[];
    coursePlaces?: CoursePlace[];
}

// 카카오맵 전역 함수 정의
declare global {
    interface Window {
        initKakaoMap: () => void;
    }
}

// 토스트 알림 컴포넌트
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

    const bgColor = {
        success: "bg-green-500",
        error: "bg-red-500",
        info: "bg-blue-500",
    }[type];

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

// 로딩 스피너 컴포넌트
const LoadingSpinner = ({ size = "large" }: { size?: "small" | "large" }) => {
    const sizeClasses = size === "large" ? "h-32 w-32" : "h-6 w-6";
    return <div className={`animate-spin rounded-full ${sizeClasses} border-b-2 border-blue-600`} />;
};

// 에러 컴포넌트
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

// 지도 대체 UI 컴포넌트
const MapFallbackUI = ({ places }: { places: CoursePlace[] }) => (
    <div className="w-full h-80 bg-gray-100 rounded-2xl flex flex-col items-center justify-center p-6">
        <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">지도 로딩 중...</h3>
            <p className="text-gray-500 mb-6">잠시만 기다려주세요</p>
            <div className="bg-white rounded-lg p-4 max-w-md">
                <h4 className="font-semibold mb-2">코스 장소 목록</h4>
                <div className="space-y-2 text-left">
                    {places.slice(0, 3).map((place, index) => (
                        <div key={place.id} className="flex items-center gap-2 text-sm">
                            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                                {index + 1}
                            </span>
                            <span>{place.place.name}</span>
                        </div>
                    ))}
                    {places.length > 3 && (
                        <div className="text-xs text-gray-500 text-center pt-2">외 {places.length - 3}개 장소</div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();

    // params가 null이거나 id가 없는 경우 처리
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

    const courseId = params.id as string; // 이제 안전하게 타입 단언 가능

    // 상태 관리
    const [courseData, setCourseData] = useState<CourseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [isShareLoading, setIsShareLoading] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsError, setReviewsError] = useState<string | null>(null);

    // 지도 관련 상태 (간소화)
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);

    // 성능 최적화를 위한 메모이제이션
    const sortedCoursePlaces = useMemo(() => {
        if (!courseData?.coursePlaces) return [];
        return [...courseData.coursePlaces].sort((a, b) => a.order_index - b.order_index);
    }, [courseData?.coursePlaces]);

    const hasPlaces = useMemo(() => {
        return sortedCoursePlaces.length > 0;
    }, [sortedCoursePlaces]);

    const firstPlace = useMemo(() => {
        return sortedCoursePlaces[0];
    }, [sortedCoursePlaces]);

    // 토스트 표시 함수
    const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
        setToast({ message, type });
    }, []);

    // 마커 이미지 생성 함수
    const createMarkerImageSrc = useCallback((orderIndex: number): string => {
        const svg = `
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#4F46E5" stroke="white" stroke-width="3"/>
                <text x="20" y="26" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="Arial, sans-serif">
                    ${orderIndex}
                </text>
            </svg>
        `;

        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    }, []);

    // 정보창 생성 함수
    const createInfoWindow = useCallback((coursePlace: CoursePlace, kakao: any) => {
        const content = `
            <div style="padding: 12px; min-width: 200px; max-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <div style="margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; line-height: 1.3;">
                        ${coursePlace.place.name}
                    </h3>
                </div>
                <div style="margin-bottom: 6px;">
                    <span style="display: inline-block; padding: 2px 8px; background-color: #3b82f6; color: white; font-size: 12px; border-radius: 12px;">
                        ${coursePlace.place.category}
                    </span>
                </div>
                <div style="font-size: 13px; color: #6b7280; line-height: 1.4;">
                    ${coursePlace.place.address}
                </div>
                ${
                    coursePlace.place.phone
                        ? `
                    <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">
                        📞 ${coursePlace.place.phone}
                    </div>
                `
                        : ""
                }
            </div>
        `;

        return new kakao.maps.InfoWindow({
            content: content,
            removable: true,
            zIndex: 1,
        });
    }, []);

    // 장소 선택 핸들러
    const handlePlaceClick = useCallback((place: MapPlace) => {
        console.log("장소 클릭:", place.name);
        setSelectedPlace(place);
    }, []);

    // 길찾기 핸들러
    const createNavigationHandler = useCallback(
        (name: string, lat: number, lng: number) => () => {
            const url = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
            window.open(url, "_blank");
        },
        []
    );

    // 지도에서 보기 핸들러
    const createMapViewHandler = useCallback(
        (name: string, lat: number, lng: number) => () => {
            router.push(`/map?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}`);
        },
        [router]
    );

    // 전체 지도 보기 (간소화)
    const handleShowFullMap = useCallback(() => {
        // KakaoMap 컴포넌트에서 자동으로 처리됨
        console.log("전체 지도 보기");
    }, []);

    // 후기 목록 가져오기
    const fetchReviews = useCallback(async () => {
        try {
            setReviewsLoading(true);
            setReviewsError(null);
            const response = await fetch(`/api/reviews?courseId=${courseId}`);
            const data = await response.json();

            if (response.ok) {
                setReviews(data.reviews || []);
            } else {
                console.error("후기 목록 가져오기 실패:", data.error);
                setReviewsError(data.error || "후기 목록을 가져오는데 실패했습니다.");
                setReviews([]);
            }
        } catch (error) {
            console.error("후기 목록 가져오기 오류:", error);
            setReviewsError("네트워크 오류가 발생했습니다.");
            setReviews([]);
        } finally {
            setReviewsLoading(false);
        }
    }, [courseId]);

    // 찜 상태 확인
    const checkFavoriteStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            const response = await fetch("/api/users/favorites", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const favorites = await response.json();
                const isFavorited = favorites.some((fav: any) => fav.course_id.toString() === courseId);
                setIsSaved(isFavorited);
            }
        } catch (error) {
            console.error("Error checking favorite status:", error);
        }
    }, [courseId]);

    // 코스 데이터 가져오기
    const fetchCourseData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            console.log("Fetching course data for ID:", courseId);
            console.log("Course ID type:", typeof courseId);

            // 캐시 확인 (임시로 비활성화)
            const cacheKey = `course_${courseId}`;
            const cachedData = sessionStorage.getItem(cacheKey);
            console.log("Cache check for key:", cacheKey);
            console.log("Cached data exists:", !!cachedData);

            // if (cachedData) {
            //     const parsedData = JSON.parse(cachedData);
            //     setCourseData(parsedData);
            //     setLoading(false);
            //     document.title = `${parsedData.title} - 코스 상세`;
            //     return;
            // }

            // API 호출
            const [courseResponse, highlightsResponse, benefitsResponse, noticesResponse, placesResponse] =
                await Promise.allSettled([
                    fetch(`/api/courses/${courseId}`),
                    fetch(`/api/courses/${courseId}/highlights`),
                    fetch(`/api/courses/${courseId}/benefits`),
                    fetch(`/api/courses/${courseId}/notices`),
                    fetch(`/api/courses/${courseId}/places`),
                ]);

            if (courseResponse.status === "rejected" || !courseResponse.value.ok) {
                throw new Error("코스 정보를 가져오는데 실패했습니다.");
            }

            const course = await courseResponse.value.json();
            console.log("API Response - Course:", course);

            const highlights =
                highlightsResponse.status === "fulfilled" && highlightsResponse.value.ok
                    ? await highlightsResponse.value.json()
                    : [];

            const benefits =
                benefitsResponse.status === "fulfilled" && benefitsResponse.value.ok
                    ? await benefitsResponse.value.json()
                    : [];

            const notices =
                noticesResponse.status === "fulfilled" && noticesResponse.value.ok
                    ? await noticesResponse.value.json()
                    : [];

            const coursePlaces =
                placesResponse.status === "fulfilled" && placesResponse.value.ok
                    ? await placesResponse.value.json()
                    : [];
            console.log("API Response - Course Places:", coursePlaces);

            const finalCourseData = {
                ...course,
                highlights,
                benefits,
                notices,
                coursePlaces,
            };

            // 캐시 저장 (임시로 비활성화)
            // sessionStorage.setItem(cacheKey, JSON.stringify(finalCourseData));
            // setTimeout(() => sessionStorage.removeItem(cacheKey), 5 * 60 * 1000);

            console.log("Final Course Data:", finalCourseData);
            setCourseData(finalCourseData);
            document.title = `${course.title} - 코스 상세`;
        } catch (err) {
            console.error("Error fetching course data:", err);
            setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    // 찜하기/해제 처리
    const handleSaveCourse = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                showToast("로그인이 필요합니다.", "error");
                router.push("/login");
                return;
            }

            if (isSaved) {
                const response = await fetch(`/api/users/favorites?courseId=${courseId}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    setIsSaved(false);
                    showToast("찜 목록에서 제거되었습니다.", "success");
                } else {
                    showToast("찜 삭제에 실패했습니다.", "error");
                }
            } else {
                const response = await fetch("/api/users/favorites", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ courseId: courseId }),
                });

                if (response.ok) {
                    setIsSaved(true);
                    showToast("찜 목록에 추가되었습니다.", "success");
                } else {
                    const errorData = await response.json();
                    if (errorData.error === "Already favorited") {
                        setIsSaved(true);
                        showToast("이미 찜한 코스입니다.", "info");
                    } else {
                        showToast("찜 추가에 실패했습니다.", "error");
                    }
                }
            }
        } catch (error) {
            console.error("Error handling favorite:", error);
            showToast("오류가 발생했습니다.", "error");
        }
    };

    // 공유하기 처리
    const handleShareCourse = () => {
        setShowShareModal(true);
    };

    const handleKakaoShare = () => {
        try {
            const shareUrl = `https://story.kakao.com/share?url=${encodeURIComponent(
                window.location.href
            )}&text=${encodeURIComponent(courseData?.title || "")}`;

            if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                window.location.href = shareUrl;
            } else {
                window.open(shareUrl, "_blank", "width=600,height=600");
            }

            setShowShareModal(false);
            showToast("카카오톡으로 공유되었습니다.", "success");
        } catch (error) {
            console.error("Error sharing to KakaoTalk:", error);
            showToast("카카오톡 공유에 실패했습니다.", "error");
        }
    };

    const handleDMShare = () => {
        try {
            const shareUrl = `instagram://library?AssetPath=${encodeURIComponent(window.location.href)}`;

            if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                window.location.href = shareUrl;
            } else {
                window.open("https://www.instagram.com/direct/inbox/", "_blank");
            }

            setShowShareModal(false);
            showToast("디엠으로 공유되었습니다.", "success");
        } catch (error) {
            console.error("Error sharing to DM:", error);
            showToast("디엠 공유에 실패했습니다.", "error");
        }
    };

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

    // 총 비용 계산
    const totalCost = useMemo(() => {
        return courseData?.price || "정보 없음";
    }, [courseData]);

    // 초기 데이터 로드
    // 사용자 위치 가져오기
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => {
                    console.log("위치 정보를 가져올 수 없습니다:", error);
                }
            );
        }
    }, []);

    useEffect(() => {
        if (courseId) {
            fetchCourseData();
        }
    }, [courseId, fetchCourseData]);

    // 첫 번째 장소를 기본 선택으로 설정
    useEffect(() => {
        if (sortedCoursePlaces.length > 0 && !selectedPlace) {
            const firstPlace = sortedCoursePlaces[0];
            setSelectedPlace({
                id: firstPlace.place.id,
                name: firstPlace.place.name,
                latitude: firstPlace.place.latitude,
                longitude: firstPlace.place.longitude,
                address: firstPlace.place.address,
                imageUrl: firstPlace.place.image_url,
                description: firstPlace.place.description,
            });
            console.log(`첫 번째 장소 자동 선택: ${firstPlace.place.name}`);
        }
    }, [sortedCoursePlaces, selectedPlace]);

    // 찜 상태 확인
    useEffect(() => {
        if (courseData) {
            checkFavoriteStatus();
        }
    }, [courseData, checkFavoriteStatus]);

    // 후기 목록 가져오기
    useEffect(() => {
        if (courseData) {
            fetchReviews();
        }
    }, [courseData, fetchReviews]);

    // 후기 작성 완료 이벤트 리스너
    useEffect(() => {
        const handleReviewSubmitted = () => {
            fetchReviews();
        };

        window.addEventListener("reviewSubmitted", handleReviewSubmitted);
        return () => {
            window.removeEventListener("reviewSubmitted", handleReviewSubmitted);
        };
    }, [fetchReviews]);

    // 로딩 상태
    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner />
                    <p className="mt-4 text-gray-600">코스 정보를 불러오는 중...</p>
                    <p className="mt-2 text-sm text-gray-500">잠시만 기다려주세요</p>
                </div>
            </main>
        );
    }

    // 에러 상태
    if (error || !courseData) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <ErrorDisplay
                        error={error || "요청하신 코스가 존재하지 않습니다."}
                        onRetry={() => {
                            setError(null);
                            fetchCourseData();
                        }}
                    />
                    <button
                        onClick={() => router.push("/courses")}
                        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        코스 목록으로 돌아가기
                    </button>
                </div>
            </main>
        );
    }

    return (
        <>
            {/* 토스트 알림 */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="min-h-screen bg-gray-50 text-black">
                {/* Hero Section */}
                <section className="relative h-96 overflow-hidden">
                    <div className="absolute inset-0">
                        <Image
                            src={courseData.imageUrl}
                            alt={courseData.title}
                            fill
                            className="object-cover"
                            priority
                            sizes="100vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                    </div>

                    <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center">
                        <div className="max-w-2xl">
                            <div className="mb-4 flex items-center gap-3 flex-wrap">
                                {courseData.isPopular && (
                                    <span className="px-4 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
                                        🔥 인기 코스
                                    </span>
                                )}
                                <span className="px-4 py-1.5 bg-blue-500 text-white text-sm font-bold rounded-full">
                                    {courseData.concept}
                                </span>
                                <span className="px-4 py-1.5 bg-purple-500 text-white text-sm font-bold rounded-full">
                                    {courseData.courseType}
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{courseData.title}</h1>
                            <p className="text-lg md:text-xl text-white/90 mb-6 line-clamp-2">
                                {courseData.description}
                            </p>

                            <div className="flex items-center gap-4 md:gap-6 text-white text-sm md:text-base flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-400 text-2xl">★</span>
                                    <span className="font-bold text-lg">{courseData.rating}</span>
                                </div>
                                <span>📍 {courseData.coursePlaces?.length || 0}개 장소</span>
                                <span>⏱ {courseData.duration}</span>
                                <span>💰 {totalCost}</span>
                                <span className="hidden md:inline">🕒 {courseData.recommendedTime}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Course Details */}
                <section className="py-16">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* 코스 설명 */}
                                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                                    <h2 className="text-2xl md:text-3xl font-bold mb-6">코스 소개</h2>
                                    <p className="text-gray-700 leading-relaxed text-base md:text-lg">
                                        {courseData.description}
                                    </p>
                                </div>

                                {/* 코스 특징 */}
                                {courseData.highlights && courseData.highlights.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
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
                                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                                    {/* 지도 섹션 */}
                                    <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
                                        <div className="relative">
                                            {hasPlaces ? (
                                                <KakaoMap
                                                    places={sortedCoursePlaces.map((cp) => ({
                                                        id: cp.place.id,
                                                        name: cp.place.name,
                                                        latitude: cp.place.latitude,
                                                        longitude: cp.place.longitude,
                                                        address: cp.place.address,
                                                        imageUrl: cp.place.image_url,
                                                        description: cp.place.description,
                                                    }))}
                                                    userLocation={null}
                                                    selectedPlace={selectedPlace}
                                                    onPlaceClick={handlePlaceClick}
                                                    draggable={false}
                                                    className="w-full h-80 rounded-2xl"
                                                    style={{ minHeight: "320px" }}
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
                                    <div className="relative pl-8 md:pl-10" style={{ willChange: "transform" }}>
                                        <div className="absolute left-4 md:left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-pink-500"></div>

                                        {hasPlaces ? (
                                            sortedCoursePlaces.map((coursePlace) => (
                                                <div key={coursePlace.id} className="relative mb-8">
                                                    <div className="absolute -left-7 md:-left-8 top-6 w-4 h-4 bg-indigo-500 rounded-full border-4 border-white shadow-lg"></div>
                                                    <div className="absolute -left-10 md:-left-12 top-4 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                                                        {coursePlace.order_index}
                                                    </div>

                                                    {/* 장소 카드 */}
                                                    <div className="bg-gray-50 rounded-xl p-4 md:p-6 border border-gray-200 hover:shadow-md transition-shadow">
                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                            {/* 장소 이미지 */}
                                                            <div className="w-full sm:w-20 h-48 sm:h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                                                {coursePlace.place.image_url ? (
                                                                    <Image
                                                                        src={coursePlace.place.image_url}
                                                                        alt={coursePlace.place.name}
                                                                        width={80}
                                                                        height={80}
                                                                        className="w-full h-full object-cover"
                                                                        loading="lazy"
                                                                        placeholder="blur"
                                                                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.style.display = "none";
                                                                            target.nextElementSibling?.classList.remove(
                                                                                "hidden"
                                                                            );
                                                                        }}
                                                                    />
                                                                ) : null}
                                                                <span className="text-2xl">📍</span>
                                                            </div>

                                                            {/* 장소 정보 */}
                                                            <div className="flex-1">
                                                                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                                                                    {coursePlace.place.name}
                                                                </h3>
                                                                <div className="text-blue-600 text-sm font-medium mb-3">
                                                                    {coursePlace.place.category}
                                                                </div>
                                                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                                                                    <span>⭐ {coursePlace.place.avg_cost_range}</span>
                                                                    <span>💰 {coursePlace.estimated_duration}분</span>
                                                                    <span>📍 {coursePlace.recommended_time}</span>
                                                                </div>
                                                                <div className="text-sm text-gray-500 mb-4">
                                                                    <p className="mb-1">{coursePlace.place.address}</p>
                                                                    {coursePlace.place.opening_hours && (
                                                                        <p>🕒 {coursePlace.place.opening_hours}</p>
                                                                    )}
                                                                    {coursePlace.place.phone && (
                                                                        <p>📞 {coursePlace.place.phone}</p>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <button
                                                                        onClick={createMapViewHandler(
                                                                            coursePlace.place.name,
                                                                            coursePlace.place.latitude,
                                                                            coursePlace.place.longitude
                                                                        )}
                                                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                                                                    >
                                                                        지도에서 보기
                                                                    </button>
                                                                    <button
                                                                        onClick={createNavigationHandler(
                                                                            coursePlace.place.name,
                                                                            coursePlace.place.latitude,
                                                                            coursePlace.place.longitude
                                                                        )}
                                                                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        길찾기
                                                                    </button>
                                                                    {coursePlace.place.phone && (
                                                                        <button
                                                                            onClick={() =>
                                                                                window.open(
                                                                                    `tel:${coursePlace.place.phone}`,
                                                                                    "_self"
                                                                                )
                                                                            }
                                                                            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            전화걸기
                                                                        </button>
                                                                    )}
                                                                    {coursePlace.place.website && (
                                                                        <button
                                                                            onClick={() =>
                                                                                window.open(
                                                                                    coursePlace.place.website,
                                                                                    "_blank"
                                                                                )
                                                                            }
                                                                            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            웹사이트
                                                                        </button>
                                                                    )}
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
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <div className="text-4xl mb-4">📍</div>
                                                <p>등록된 장소가 없습니다.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 혜택 및 준비물 */}
                                {courseData.benefits && courseData.benefits.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                                        <h2 className="text-2xl md:text-3xl font-bold mb-6">혜택 및 준비물</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {courseData.benefits
                                                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                                                .map((benefit) => (
                                                    <div
                                                        key={benefit.id}
                                                        className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:shadow-md transition-shadow"
                                                    >
                                                        <span className="text-green-500 text-xl flex-shrink-0">✓</span>
                                                        <span className="text-gray-700 font-medium">
                                                            {benefit.benefit_text}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* 참고사항 */}
                                {courseData.notices && courseData.notices.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                                        <h2 className="text-2xl md:text-3xl font-bold mb-6">참고사항</h2>
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                                            <div className="flex items-start gap-3 mb-4">
                                                <span className="text-yellow-600 text-2xl flex-shrink-0">⚠️</span>
                                                <h3 className="font-semibold text-yellow-800">
                                                    코스 이용 전 반드시 확인해 주세요
                                                </h3>
                                            </div>
                                            <ul className="space-y-3">
                                                {courseData.notices.map((notice) => (
                                                    <li key={notice.id} className="flex items-start gap-2">
                                                        <span className="text-yellow-600 mt-1 flex-shrink-0">•</span>
                                                        <span className="text-gray-700">{notice.notice_text}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* 리뷰 섹션 */}
                                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl md:text-3xl font-bold">이용후기</h2>
                                        <button
                                            onClick={() => setShowReviewModal(true)}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                                        >
                                            후기 작성하기
                                        </button>
                                    </div>

                                    {reviewsLoading ? (
                                        <div className="text-center py-8">
                                            <LoadingSpinner />
                                            <p className="mt-2 text-gray-500">후기를 불러오는 중...</p>
                                        </div>
                                    ) : reviewsError ? (
                                        <div className="text-center py-8">
                                            <div className="text-4xl mb-4">⚠️</div>
                                            <p className="text-lg mb-2 text-red-600">후기 목록을 불러올 수 없습니다</p>
                                            <p className="text-sm text-gray-500 mb-4">{reviewsError}</p>
                                            <button
                                                onClick={fetchReviews}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                                            >
                                                다시 시도
                                            </button>
                                        </div>
                                    ) : reviews.length > 0 ? (
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
                            <div className="lg:col-span-1">
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
                                                <div className="flex items-center gap-1">
                                                    <span className="text-yellow-400">★</span>
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
                                            <div className="border-t pt-4 space-y-3">
                                                <button
                                                    onClick={handleSaveCourse}
                                                    className={`w-full py-3 font-bold rounded-lg transition-all duration-300 transform hover:scale-105 ${
                                                        isSaved
                                                            ? "bg-red-500 text-white hover:bg-red-600"
                                                            : "bg-pink-500 text-white hover:bg-pink-600"
                                                    }`}
                                                    aria-label={isSaved ? "찜 해제하기" : "찜하기"}
                                                >
                                                    {isSaved ? "💖 찜 완료" : "🤍 찜하기"}
                                                </button>
                                                <button
                                                    onClick={handleShareCourse}
                                                    disabled={isShareLoading}
                                                    className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    aria-label="코스 공유하기"
                                                >
                                                    {isShareLoading ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <LoadingSpinner size="small" />
                                                            공유 중...
                                                        </span>
                                                    ) : (
                                                        "📤 공유하기"
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 코스 정보 */}
                                    <div className="bg-white rounded-2xl shadow-lg p-6">
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
                                                    <p className="font-medium text-gray-800">추천 시간</p>
                                                    <p className="text-sm text-gray-600">
                                                        {courseData.recommendedTime}
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

                                    {/* 관련 코스 추천 */}
                                    <div className="bg-white rounded-2xl shadow-lg p-6">
                                        <h3 className="text-xl font-bold mb-4">비슷한 코스</h3>
                                        <div className="text-center py-8 text-gray-500">
                                            <div className="text-4xl mb-2">🎯</div>
                                            <p className="text-sm">
                                                곧 추천 코스를
                                                <br />
                                                제공할 예정입니다!
                                            </p>
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
                            className={`flex-1 py-3 font-bold rounded-lg transition-all duration-300 ${
                                isSaved ? "bg-red-500 text-white" : "bg-pink-500 text-white"
                            }`}
                        >
                            {isSaved ? "💖 찜 완료" : "🤍 찜하기"}
                        </button>
                        <button
                            onClick={handleShareCourse}
                            disabled={isShareLoading}
                            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg disabled:opacity-50"
                        >
                            {isShareLoading ? "공유 중..." : "📤 공유하기"}
                        </button>
                    </div>
                </div>

                {/* 모바일에서 하단 여백 추가 */}
                <div className="lg:hidden h-20"></div>
            </div>

            {/* 공유 모달 */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-800">공유하기</h3>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={handleKakaoShare}
                                className="w-full flex items-center gap-4 p-4 bg-yellow-400 text-white rounded-xl hover:bg-yellow-500 transition-colors"
                            >
                                <div className="text-2xl">💬</div>
                                <div className="text-left">
                                    <div className="font-bold">카카오톡으로 공유</div>
                                    <div className="text-sm opacity-90">카카오톡 채팅으로 공유하기</div>
                                </div>
                            </button>

                            <button
                                onClick={handleDMShare}
                                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors"
                            >
                                <div className="text-2xl">📱</div>
                                <div className="text-left">
                                    <div className="font-bold">디엠으로 공유</div>
                                    <div className="text-sm opacity-90">인스타그램 디엠으로 공유하기</div>
                                </div>
                            </button>

                            <button
                                onClick={handleCopyLink}
                                className="w-full flex items-center gap-4 p-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                <div className="text-2xl">📋</div>
                                <div className="text-left">
                                    <div className="font-bold">링크 복사</div>
                                    <div className="text-sm opacity-90">클립보드에 링크 복사하기</div>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowShareModal(false)}
                            className="w-full mt-6 py-3 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            취소
                        </button>
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
                        image: courseData.imageUrl,
                        touristType: courseData.courseType,
                        duration: courseData.duration,
                        offers: {
                            "@type": "Offer",
                            price: courseData.price,
                            priceCurrency: "KRW",
                        },
                        aggregateRating: {
                            "@type": "AggregateRating",
                            ratingValue: courseData.rating,
                            bestRating: 5,
                        },
                        itinerary:
                            courseData.coursePlaces?.map((place) => ({
                                "@type": "TouristDestination",
                                name: place.place.name,
                                description: place.place.description,
                                address: place.place.address,
                                geo: {
                                    "@type": "GeoCoordinates",
                                    latitude: place.place.latitude,
                                    longitude: place.place.longitude,
                                },
                            })) || [],
                    }),
                }}
            />
        </>
    );
}
