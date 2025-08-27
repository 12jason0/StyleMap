"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
}

interface Notice {
    id: number;
    notice_text: string;
    type: string;
}

interface Contact {
    id: number;
    type: string;
    icon: string;
    label: string;
    value: string;
    description: string;
}

interface CourseData extends Course {
    highlights?: Highlight[];
    benefits?: Benefit[];
    notices?: Notice[];
    contacts?: Contact[];
}

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [courseData, setCourseData] = useState<CourseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                const [course, highlights, benefits, notices, contacts] = await Promise.all([
                    fetch(`/api/courses/${params.id}`).then((r) => r.json()),
                    fetch(`/api/courses/${params.id}/highlights`).then((r) => r.json()),
                    fetch(`/api/courses/${params.id}/benefits`).then((r) => r.json()),
                    fetch(`/api/courses/${params.id}/notices`).then((r) => r.json()),
                    fetch(`/api/courses/${params.id}/contacts`).then((r) => r.json()),
                ]);

                setCourseData({
                    ...course,
                    highlights,
                    benefits,
                    notices,
                    contacts,
                });
            } catch (err) {
                console.error("Error fetching course data:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchCourseData();
        }
    }, [params.id]);

    const handleStartCourse = () => {
        // 실제 코스 시작 로직으로 교체
        alert("코스 시작 기능은 준비 중입니다.");
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">코스 정보를 불러오는 중...</p>
                </div>
            </main>
        );
    }

    if (error || !courseData) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">코스를 찾을 수 없습니다</h1>
                    <p className="text-gray-600 mb-6">{error || "요청하신 코스가 존재하지 않습니다."}</p>
                    <button
                        onClick={() => router.push("/courses")}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                        코스 목록으로 돌아가기
                    </button>
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-black">
            {/* Hero Section */}
            <section className="relative h-96 overflow-hidden">
                <div className="absolute inset-0">
                    <img src={courseData.imageUrl} alt={courseData.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                </div>

                <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center">
                    <div className="max-w-2xl">
                        <div className="mb-4 flex items-center gap-3">
                            {courseData.isPopular && (
                                <span className="px-4 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full">
                                    🔥 인기 코스
                                </span>
                            )}
                            <span className="px-4 py-1.5 bg-blue-500 text-white text-sm font-bold rounded-full">
                                {courseData.concept}
                            </span>
                        </div>

                        <h1 className="text-5xl font-bold text-white mb-4">{courseData.title}</h1>
                        <p className="text-xl text-white/90 mb-6">{courseData.description}</p>

                        <div className="flex items-center gap-6 text-white">
                            <div className="flex items-center gap-2">
                                <span className="text-yellow-400 text-2xl">★</span>
                                <span className="font-bold text-lg">{courseData.rating}</span>
                            </div>
                            <span>📍 {courseData.location}</span>
                            <span>⏱ {courseData.duration}</span>
                            <span>💰 {courseData.price}</span>
                            <span>
                                👥 {courseData.participants}/{courseData.maxParticipants}
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
                                    {/* 코스 설명 */}
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3">코스 설명</h3>
                                        <p className="text-gray-700 leading-relaxed">{courseData.description}</p>
                                    </div>

                                    {/* 코스 정보 */}
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3">코스 정보</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500">📍 위치</span>
                                                <span className="font-medium">{courseData.location}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500">⏱ 소요시간</span>
                                                <span className="font-medium">{courseData.duration}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500">💰 가격</span>
                                                <span className="font-medium">{courseData.price}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500">🎯 컨셉</span>
                                                <span className="font-medium">{courseData.concept}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 코스 특징 */}
                                    {courseData.highlights && courseData.highlights.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-semibold mb-3">코스 특징</h3>
                                            <div className="space-y-3">
                                                {courseData.highlights.map((highlight) => (
                                                    <div key={highlight.id} className="flex items-start gap-3">
                                                        <span className="text-blue-500 text-xl mt-1">
                                                            {highlight.icon}
                                                        </span>
                                                        <div>
                                                            <h4 className="text-gray-700 font-medium mb-1">
                                                                {highlight.title}
                                                            </h4>
                                                            <p className="text-gray-500 text-sm">
                                                                {highlight.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 혜택 목록 */}
                                    {courseData.benefits && courseData.benefits.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-semibold mb-3">준비물 및 혜택</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {courseData.benefits.map((benefit) => (
                                                    <div key={benefit.id} className="flex items-start gap-2">
                                                        <span className="text-green-500 mt-1">✓</span>
                                                        <span className="text-gray-700">{benefit.benefit_text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 주의사항 */}
                                    {courseData.notices && courseData.notices.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-semibold mb-3">주의사항</h3>
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                <ul className="space-y-2 text-gray-700">
                                                    {courseData.notices.map((notice) => (
                                                        <li key={notice.id} className="flex items-start gap-2">
                                                            <span className="text-yellow-600 mt-1">•</span>
                                                            <span>{notice.notice_text}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-6 space-y-6">
                                {/* 코스 시작 카드 */}
                                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                                    <h3 className="text-xl font-bold mb-4">코스 시작</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">참가자 수</span>
                                            <span className="font-semibold">
                                                {courseData.participants}/{courseData.maxParticipants}
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
                                            <span className="text-gray-600">가격</span>
                                            <span className="font-semibold text-lg text-blue-600">
                                                {courseData.price}
                                            </span>
                                        </div>
                                        <div className="border-t pt-4">
                                            <button
                                                onClick={handleStartCourse}
                                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all duration-300 cursor-pointer"
                                            >
                                                코스 시작하기
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 크리에이터 정보 */}
                                {courseData.creator && (
                                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                                        <h3 className="text-xl font-bold mb-4">크리에이터</h3>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {courseData.creator.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{courseData.creator.name}</p>
                                                <p className="text-sm text-gray-500">크리에이터</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 문의하기 */}
                                {courseData.contacts && courseData.contacts.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                                        <h3 className="text-xl font-bold mb-4">문의하기</h3>
                                        <div className="space-y-4">
                                            {courseData.contacts.map((contact) => (
                                                <div key={contact.id} className="flex items-start gap-3">
                                                    <span className="text-blue-500 text-xl mt-1">{contact.icon}</span>
                                                    <div className="flex-1">
                                                        <p className="text-gray-700 font-medium">{contact.label}</p>
                                                        <p className="text-gray-900 font-semibold">{contact.value}</p>
                                                        {contact.description && (
                                                            <p className="text-gray-400 text-sm">
                                                                {contact.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
