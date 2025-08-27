"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

interface Course {
    id: string;
    title: string;
    description: string;
    duration: string;
    location: string;
    price: string;
    imageUrl: string;
    concept: string;
    rating: number;
    reviewCount: number;
    participants: number;
}

const PersonalizedHome = () => {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [userPreferences, setUserPreferences] = useState<any>(null);

    useEffect(() => {
        fetchCourses();
        fetchUserPreferences();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            const data = await response.json();

            if (Array.isArray(data)) {
                setCourses(data.slice(0, 12));
            } else if (data.error) {
                console.error("API Error:", data.error, data.details);
                // Fallback to dummy data on error
                setCourses([
                    {
                        id: "1",
                        title: "성수 감성 카페투어",
                        description: "성수동의 숨겨진 감성 카페들을 탐방하는 투어",
                        duration: "3시간",
                        location: "성수동",
                        price: "30000원",
                        imageUrl: "/images/CoffeTrand.png",
                        concept: "핫플투어",
                        rating: 4.8,
                        reviewCount: 23,
                        participants: 15,
                    },
                    {
                        id: "2",
                        title: "홍대 팝업스토어 투어",
                        description: "홍대의 트렌디한 팝업스토어들을 둘러보는 투어",
                        duration: "4시간",
                        location: "홍대",
                        price: "40000원",
                        imageUrl: "/images/Popup.png",
                        concept: "핫플투어",
                        rating: 4.6,
                        reviewCount: 18,
                        participants: 12,
                    },
                    {
                        id: "3",
                        title: "비오는날 실내 데이트",
                        description: "비오는 날에도 즐거운 실내 데이트 코스",
                        duration: "5시간",
                        location: "강남",
                        price: "50000원",
                        imageUrl: "/images/RainDate.png",
                        concept: "힐링여행",
                        rating: 4.7,
                        reviewCount: 31,
                        participants: 8,
                    },
                    {
                        id: "4",
                        title: "강남 맛집 탐방",
                        description: "강남의 숨겨진 맛집들을 찾아가는 투어",
                        duration: "4시간",
                        location: "강남",
                        price: "45000원",
                        imageUrl: "/images/FoodTour.png",
                        concept: "맛집투어",
                        rating: 4.9,
                        reviewCount: 45,
                        participants: 20,
                    },
                    {
                        id: "5",
                        title: "한강 공원 힐링",
                        description: "한강 공원에서 즐기는 힐링 시간",
                        duration: "3시간",
                        location: "여의도",
                        price: "25000원",
                        imageUrl: "/images/Hangang.png",
                        concept: "힐링여행",
                        rating: 4.5,
                        reviewCount: 28,
                        participants: 15,
                    },
                    {
                        id: "6",
                        title: "명동 쇼핑 투어",
                        description: "명동의 쇼핑 명소들을 둘러보는 투어",
                        duration: "6시간",
                        location: "명동",
                        price: "35000원",
                        imageUrl: "/images/Myeongdong.png",
                        concept: "쇼핑투어",
                        rating: 4.3,
                        reviewCount: 19,
                        participants: 10,
                    },
                ]);
            } else {
                console.error("Unexpected data format:", data);
                setCourses([]);
            }
        } catch (error) {
            console.error("Failed to fetch courses:", error);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPreferences = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                return;
            }

            const response = await fetch("/api/users/preferences", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setUserPreferences(data);
            }
        } catch (error) {
            console.error("Failed to fetch user preferences:", error);
        }
    };

    const getPersonalizedGreeting = () => {
        if (!userPreferences) {
            return "안녕하세요! 🎯";
        }

        const { travelStyle, budgetRange } = userPreferences;

        if (travelStyle?.includes("힐링 & 휴식")) {
            return "힐링을 원하시는군요! 😌";
        } else if (travelStyle?.includes("액티브한 모험")) {
            return "모험을 찾고 계시는군요! 🏃‍♂️";
        } else if (travelStyle?.includes("맛집 투어")) {
            return "맛집 탐방을 좋아하시는군요! 🍽️";
        } else {
            return "개인화된 추천을 받아보세요! 🎯";
        }
    };

    const getRecommendationReason = (course: Course) => {
        if (!userPreferences) return "인기 코스";

        const { travelStyle, locationPreferences, budgetRange } = userPreferences;

        if (travelStyle?.includes("힐링 & 휴식") && course.concept === "힐링여행") {
            return "힐링 선호도 기반 추천";
        }

        if (travelStyle?.includes("맛집 투어") && course.concept === "맛집투어") {
            return "맛집 탐방 선호도 기반 추천";
        }

        if (locationPreferences?.includes(course.location)) {
            return "선호 지역 기반 추천";
        }

        if (budgetRange === "budget" && parseInt(course.price) < 30000) {
            return "예산에 맞는 추천";
        }

        return "개인화 추천";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">AI가 당신을 위한 추천을 준비하고 있어요...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <Header />

            <main className="max-w-7xl mx-auto px-4 py-8 pt-25">
                {/* 헤더 섹션 */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">{getPersonalizedGreeting()}</h1>
                    <p className="text-xl text-gray-600 mb-8">당신의 취향을 분석해서 맞춤형 코스를 추천해드려요</p>

                    {!userPreferences && (
                        <button
                            onClick={() => router.push("/onboarding")}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all transform hover:scale-105"
                        >
                            🎯 취향 설정하기
                        </button>
                    )}
                </div>

                {/* 추천 코스 섹션 */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <span className="mr-3">✨</span>
                        AI 맞춤 추천 코스
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <div
                                key={course.id}
                                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden"
                                onClick={() => router.push(`/courses/${course.id}`)}
                            >
                                <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-6xl opacity-20">🎯</span>
                                    </div>
                                    <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                                        {getRecommendationReason(course)}
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                                    <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            <span>⏰ {course.duration}</span>
                                            <span>📍 {course.location}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-yellow-400">⭐</span>
                                            <span className="text-sm font-medium">{course.rating}</span>
                                            <span className="text-xs text-gray-500">({course.reviewCount})</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-bold text-blue-600">{course.price}</span>
                                        <span className="text-sm text-gray-500">👥 {course.participants}명 참여</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 개인화 설정 섹션 */}
                {!userPreferences && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="text-6xl mb-6">🎯</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">더 정확한 추천을 받고 싶으신가요?</h3>
                        <p className="text-gray-600 mb-6">간단한 취향 설정으로 더욱 맞춤형 코스를 추천받을 수 있어요</p>
                        <button
                            onClick={() => router.push("/onboarding")}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all transform hover:scale-105"
                        >
                            취향 설정 시작하기
                        </button>
                    </div>
                )}

                {/* 사용자 선호도 표시 */}
                {userPreferences && (
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">내 선호도</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {userPreferences.travelStyle?.map((style: string) => (
                                <div
                                    key={style}
                                    className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium"
                                >
                                    {style}
                                </div>
                            ))}
                            {userPreferences.locationPreferences?.map((location: string) => (
                                <div
                                    key={location}
                                    className="bg-purple-50 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium"
                                >
                                    📍 {location}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => router.push("/onboarding")}
                            className="mt-4 text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                            선호도 수정하기
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PersonalizedHome;
