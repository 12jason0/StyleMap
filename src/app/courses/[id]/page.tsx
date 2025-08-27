"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
    participants: number;
    maxParticipants: number;
    isPopular: boolean;
    creator?: {
        id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const response = await fetch(`/api/courses/${params.id}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch course");
                }
                const data = await response.json();
                setCourse(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchCourse();
        }
    }, [params.id]);

    if (loading) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">코스 정보를 불러오는 중...</p>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (error || !course) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-800 mb-4">코스를 찾을 수 없습니다</h1>
                        <p className="text-gray-600 mb-6">{error || "요청하신 코스가 존재하지 않습니다."}</p>
                        <button
                            onClick={() => router.push("/courses")}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            코스 목록으로 돌아가기
                        </button>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="min-h-screen bg-gray-50">
                {/* Hero Section */}
                <section className="relative h-96 overflow-hidden">
                    <div className="absolute inset-0">
                        <img
                            src={course.imageUrl || "/images/default-course.jpg"}
                            alt={course.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                    </div>

                    <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center">
                        <div className="max-w-2xl">
                            <div className="mb-4 flex items-center gap-3">
                                {course.isPopular && (
                                    <span className="px-4 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full">
                                        🔥 인기 코스
                                    </span>
                                )}
                                <span className="px-4 py-1.5 bg-blue-500 text-white text-sm font-bold rounded-full">
                                    {course.concept}
                                </span>
                            </div>

                            <h1 className="text-5xl font-bold text-white mb-4">{course.title}</h1>
                            <p className="text-xl text-white/90 mb-6">{course.description}</p>

                            <div className="flex items-center gap-6 text-white">
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-400 text-2xl">★</span>
                                    <span className="font-bold text-lg">{course.rating}</span>
                                </div>
                                <span>📍 {course.location}</span>
                                <span>⏱ {course.duration}</span>
                                <span>💰 {course.price}</span>
                                <span>
                                    👥 {course.participants}/{course.maxParticipants}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Course Details */}
                <section className="py-16">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-2xl shadow-lg p-8">
                                    <h2 className="text-3xl font-bold mb-6">코스 상세 정보</h2>

                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-xl font-semibold mb-3">코스 설명</h3>
                                            <p className="text-gray-700 leading-relaxed">{course.description}</p>
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-semibold mb-3">코스 정보</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-500">📍 위치</span>
                                                    <span className="font-medium">{course.location}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-500">⏱ 소요시간</span>
                                                    <span className="font-medium">{course.duration}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-500">💰 가격</span>
                                                    <span className="font-medium">{course.price}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-500">🎯 컨셉</span>
                                                    <span className="font-medium">{course.concept}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Booking Card */}
                                <div className="bg-white rounded-2xl shadow-lg p-6">
                                    <h3 className="text-xl font-bold mb-4">코스 예약</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">참가자 수</span>
                                            <span className="font-semibold">
                                                {course.participants}/{course.maxParticipants}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">평점</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-yellow-400">★</span>
                                                <span className="font-semibold">{course.rating}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => alert("예약 기능은 준비 중입니다.")}
                                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all duration-300"
                                        >
                                            코스 예약하기
                                        </button>
                                    </div>
                                </div>

                                {/* Creator Info */}
                                {course.creator && (
                                    <div className="bg-white rounded-2xl shadow-lg p-6">
                                        <h3 className="text-xl font-bold mb-4">코스 크리에이터</h3>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {course.creator.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{course.creator.name}</p>
                                                <p className="text-sm text-gray-500">크리에이터</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

