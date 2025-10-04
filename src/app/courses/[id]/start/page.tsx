"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import ReviewModal from "@/components/ReviewModal";

// 타입 정의 (courses/[id]/page.tsx와 유사)
type Place = {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    imageUrl?: string;
    notes?: string;
    category?: string;
};

type CoursePlace = {
    order_index: number;
    place: Place;
};

type Course = {
    id: string;
    title: string;
    coursePlaces: CoursePlace[];
};

// 로딩 컴포넌트
function LoadingSpinner() {
    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-[500px] mx-auto px-4 py-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    <p className="text-gray-700">코스를 불러오는 중...</p>
                </div>
                <div className="h-64 rounded-2xl bg-gray-200 animate-pulse" />
            </div>
        </main>
    );
}

// 지도 컴포넌트 동적 로딩
const NaverMap = dynamic(() => import("@/components/NaverMap"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-200 flex items-center justify-center">지도 로딩중...</div>,
});

function GuidePageInner() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.id as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(0); // 현재 진행 단계 (인덱스)
    const [showPanel, setShowPanel] = useState(true); // 지도 위 패널 표시/숨김
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [showCongrats, setShowCongrats] = useState(false);
    const [showReview, setShowReview] = useState(false);

    // 코스 데이터 불러오기
    useEffect(() => {
        if (!courseId) return;
        const fetchCourse = async () => {
            try {
                const res = await fetch(`/api/courses/${courseId}`);
                if (!res.ok) throw new Error("코스 정보를 가져올 수 없습니다.");
                const data = await res.json();
                // coursePlaces를 order_index 순으로 정렬하여 저장
                data.coursePlaces.sort((a: CoursePlace, b: CoursePlace) => a.order_index - b.order_index);
                setCourse(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [courseId]);

    // 현재 위치 가져오기 (watchPosition으로 지속 업데이트)
    useEffect(() => {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
            const onOk = (pos: GeolocationPosition) =>
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            const onErr = () => setUserLocation(null);
            // 빠른 초기 위치: 캐시 우선 (maximumAge 크게), 고정밀은 비활성화
            navigator.geolocation.getCurrentPosition(onOk, onErr, {
                enableHighAccuracy: false,
                timeout: 6000,
                maximumAge: 5 * 60 * 1000,
            });
            const id = navigator.geolocation.watchPosition(onOk, onErr, {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 2 * 60 * 1000,
            });
            return () => {
                navigator.geolocation.clearWatch?.(id);
            };
        }
        return () => {};
    }, []);

    // 전체 화면 고정: start 페이지에서 스크롤 비활성화 및 높이 고정
    useEffect(() => {
        try {
            const mainEl = document.querySelector("main") as HTMLElement | null;
            if (!mainEl) return;
            const previousClassName = mainEl.className;
            const previousStyle = { overflow: mainEl.style.overflow, height: mainEl.style.height } as const;
            mainEl.classList.remove("overflow-y-auto", "overscroll-contain", "no-scrollbar", "scrollbar-hide");
            mainEl.classList.add("overflow-hidden");
            if (!mainEl.style.height) mainEl.style.height = "100vh";
            return () => {
                try {
                    mainEl.className = previousClassName;
                    mainEl.style.overflow = previousStyle.overflow;
                    mainEl.style.height = previousStyle.height;
                } catch {}
            };
        } catch {}
    }, []);

    // 현재 단계의 장소 정보
    const currentPlace = course?.coursePlaces?.[currentStep]?.place;

    // 지도 경로용 장소 배열 (현재 위치 -> 현재 장소)
    const mapPlaces = useMemo(() => {
        if (!currentPlace)
            return [] as Array<{ id: number; name: string; latitude: number; longitude: number; address?: string }>;
        const dest = {
            id: currentPlace.id,
            name: currentPlace.name,
            latitude: currentPlace.latitude,
            longitude: currentPlace.longitude,
            address: currentPlace.address,
        };
        if (userLocation) {
            const origin = {
                id: -1,
                name: "현재 위치",
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                address: "",
            };
            return [origin, dest];
        }
        return [dest];
    }, [currentPlace, userLocation]);

    // 다음/이전 장소로 이동하는 함수
    const goToNextStep = () => {
        if (course && currentStep < course.coursePlaces.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };
    const goToPrevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (loading || !course || !currentPlace) {
        return <LoadingSpinner />;
    }

    const isLastStep = currentStep === course.coursePlaces.length - 1;

    async function markCompleted() {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
            await fetch("/api/users/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: "include",
                body: JSON.stringify({ courseId: Number(courseId), title: course?.title }),
            });
        } catch {}
    }

    return (
        <div className="flex flex-col h-screen bg-white text-black">
            {/* 지도 영역 */}
            <div className="flex-1 relative min-w-0">
                <NaverMap
                    places={mapPlaces as any}
                    userLocation={userLocation}
                    selectedPlace={null}
                    onPlaceClick={() => {}}
                    className="w-full h-full"
                    drawPath={Boolean(userLocation && (mapPlaces as any)?.length > 0)}
                    routeMode="driving"
                />

                {/* 패널 토글 버튼 - 헤더 아래 여백 확보 */}
                <button
                    onClick={() => setShowPanel((v) => !v)}
                    className="absolute left-4 z-20 px-3 py-2 rounded-lg bg-black/60 text-white backdrop-blur hover:bg-black/70 hover:cursor-pointer"
                    style={{ top: 72 }}
                >
                    {showPanel ? "숨기기" : "보이기"}
                </button>

                {/* 지도 위 하단 모달 패널 */}
                {showPanel && (
                    <div className="absolute inset-x-0 bottom-10 md:10 md:bottom-6 z-10 px-4 pt-[env(safe-area-inset-bottom)] ">
                        <div className="w-full max-w-sm sm:max-w-md mx-auto bg-white/95 backdrop-blur rounded-2xl shadow-xl border p-4">
                            <div className="mb-3">
                                <h2 className="text-xl font-bold">{currentPlace.name}</h2>
                                <p className="text-sm text-gray-500">{currentPlace.address}</p>
                                {currentPlace.notes && (
                                    <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded-md mt-2">
                                        💡 팁: {currentPlace.notes}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={goToPrevStep}
                                    disabled={currentStep === 0}
                                    className="px-4 py-2 text-base rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 hover:cursor-pointer"
                                >
                                    ← 이전
                                </button>

                                <button
                                    onClick={() => {
                                        const name = currentPlace.name;
                                        const lat = currentPlace.latitude;
                                        const lng = currentPlace.longitude;
                                        const base = `https://map.naver.com/v5/directions`;
                                        if (userLocation) {
                                            const url = `${base}/${userLocation.lng},${
                                                userLocation.lat
                                            },내 위치,,/${lng},${lat},${encodeURIComponent(name)},,WALKING`;
                                            window.open(url, "_blank");
                                        } else {
                                            const url = `${base}/${lng},${lat},${encodeURIComponent(name)},,WALKING`;
                                            window.open(url, "_blank");
                                        }
                                    }}
                                    className="flex-1 text-center px-4 py-3 text-base rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-500 hover:cursor-pointer"
                                >
                                    길찾기
                                </button>

                                {isLastStep ? (
                                    <button
                                        onClick={async () => {
                                            await markCompleted();
                                            setShowCongrats(true);
                                        }}
                                        className="px-4 py-2 text-base rounded-lg bg-green-500 text-white hover:bg-green-600 hover:cursor-pointer"
                                    >
                                        코스 완료!
                                    </button>
                                ) : (
                                    <button
                                        onClick={goToNextStep}
                                        className="px-4 py-2 text-base rounded-lg bg-blue-600 text-white hover:bg-blue-700 hover:cursor-pointer"
                                    >
                                        다음 →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* 완료 축하 모달 */}
            {showCongrats && (
                <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="text-5xl mb-2">🎉</div>
                        <h3 className="text-xl font-bold mb-1">축하드려요!</h3>
                        <p className="text-gray-600 mb-5">코스를 완료했어요.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCongrats(false);
                                    setShowReview(true);
                                }}
                                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:cursor-pointer"
                            >
                                후기 작성
                            </button>
                            <button
                                onClick={() => router.push("/mypage?tab=completed")}
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 hover:cursor-pointer"
                            >
                                마이페이지
                            </button>
                        </div>
                        <button
                            onClick={() => setShowCongrats(false)}
                            className="mt-4 text-sm text-gray-500 hover:text-gray-700"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
            {/* 후기 작성 모달 */}
            <ReviewModal
                isOpen={showReview}
                onClose={() => setShowReview(false)}
                courseId={Number(courseId)}
                courseName={course.title}
            />
        </div>
    );
}

export default function GuidePage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <GuidePageInner />
        </Suspense>
    );
}
