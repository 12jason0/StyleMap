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
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
            <p className="text-xl text-gray-700">코스를 불러오는 중...</p>
        </div>
    );
}

// 지도 컴포넌트 동적 로딩
const KakaoMap = dynamic(() => import("@/components/KakaoMap"), {
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

    // 전체 스크롤 비활성화 + 현재 위치 가져오기
    useEffect(() => {
        const original = typeof document !== "undefined" ? document.body.style.overflow : "";
        if (typeof document !== "undefined") document.body.style.overflow = "hidden";
        if (typeof navigator !== "undefined" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setUserLocation(null),
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
            );
        }
        return () => {
            if (typeof document !== "undefined") document.body.style.overflow = original;
        };
    }, []);

    // 현재 단계의 장소 정보
    const currentPlace = course?.coursePlaces?.[currentStep]?.place;

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
            await fetch("/api/users/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ courseId, title: course?.title }),
            });
        } catch {}
    }

    return (
        <div className="flex flex-col h-screen bg-white text-black pt-16">
            {/* 지도 영역 */}
            <div className="flex-1 relative min-w-0">
                <KakaoMap
                    places={[{ ...currentPlace, id: currentPlace.id }]}
                    userLocation={userLocation}
                    selectedPlace={null}
                    onPlaceClick={() => {}}
                    className="w-full h-full"
                    drawPath={!!userLocation}
                    routeMode="driving"
                />

                {/* 패널 토글 버튼 */}
                <button
                    onClick={() => setShowPanel((v) => !v)}
                    className="absolute top-4 left-4 z-20 px-3 py-2 rounded-lg bg-black/60 text-white backdrop-blur hover:bg-black/70 hover:cursor-pointer"
                >
                    {showPanel ? "숨기기" : "보이기"}
                </button>

                {/* 지도 위 하단 모달 패널 */}
                {showPanel && (
                    <div className="absolute inset-x-0 bottom-20 z-10 px-4 pb-[env(safe-area-inset-bottom)]">
                        <div className="w-full max-w-sm sm:max-w-md mx-auto bg-white rounded-2xl shadow-xl border p-4">
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
                                        if (userLocation) {
                                            const url = `https://map.kakao.com/link/from/${encodeURIComponent(
                                                "내 위치"
                                            )},${userLocation.lat},${userLocation.lng}/to/${encodeURIComponent(
                                                name
                                            )},${lat},${lng}`;
                                            window.open(url, "_blank");
                                        } else {
                                            const url = `https://map.kakao.com/link/to/${encodeURIComponent(
                                                name
                                            )},${lat},${lng}`;
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
