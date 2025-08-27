"use client";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Course {
    id: string;
    title: string;
    description: string;
    duration: string;
    location: string;
    price: string;
    participants: number;
    imageUrl: string;
    concept: string;
    rating: number;
    reviewCount: number;
    creator?: {
        id: string;
        name: string;
    };
}

export default function CoursesPage() {
    const searchParams = useSearchParams();
    const concept = searchParams.get("concept");
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const url = concept ? `/api/courses?concept=${encodeURIComponent(concept)}` : "/api/courses";

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error("Failed to fetch courses");
                }

                const data = await response.json();
                setCourses(data);
                setError(null);
            } catch (err) {
                console.error("Error fetching courses:", err);
                setError("코스를 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [concept]);

    const handleBooking = async (courseId: string) => {
        try {
            // 실제로는 사용자 인증이 필요합니다
            const userId = "temp-user-id"; // 임시 사용자 ID

            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId,
                    courseId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "예약에 실패했습니다.");
            }

            alert("코스 예약이 완료되었습니다!");

            // 코스 목록 새로고침
            const url = concept ? `/api/courses?concept=${encodeURIComponent(concept)}` : "/api/courses";
            const coursesResponse = await fetch(url);
            const coursesData = await coursesResponse.json();
            setCourses(coursesData);
        } catch (err) {
            console.error("Error booking course:", err);
            alert(err instanceof Error ? err.message : "예약에 실패했습니다.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">로딩 중...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😔</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h3>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
                    >
                        다시 시도하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {concept ? `${concept} 코스` : "모든 코스"}
                            </h1>
                            <p className="text-gray-600 mt-2">
                                {concept ? `${concept} 관련 코스를 찾아보세요` : "다양한 코스를 둘러보세요"}
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
                        >
                            ← 홈으로
                        </Link>
                    </div>
                </div>
            </div>

            {/* 코스 목록 */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <Link
                            key={course.id}
                            href={`/courses/${course.id}`}
                            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer block"
                        >
                            {/* 이미지 */}
                            <div className="relative h-48 rounded-t-2xl overflow-hidden">
                                <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                                <div className="absolute top-4 right-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                    {course.concept}
                                </div>
                            </div>

                            {/* 내용 */}
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <span className="text-yellow-500">★</span>
                                        <span className="ml-1">{course.rating}</span>
                                        <span className="ml-1">({course.reviewCount})</span>
                                    </div>
                                </div>

                                <p className="text-gray-600 mb-4">{course.description}</p>

                                {/* 정보 태그 */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                                        ⏱ {course.duration}
                                    </span>
                                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                                        📍 {course.location}
                                    </span>
                                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                                        💰 {course.price}
                                    </span>
                                </div>

                                {/* 참가자 수 */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-blue-600 font-medium">
                                        👥 지금 {course.participants}명 진행중
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleBooking(course.id);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                                    >
                                        코스 시작하기
                                    </button>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {courses.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">😔</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {concept ? `${concept} 관련 코스가 없습니다` : "코스를 찾을 수 없습니다"}
                        </h3>
                        <p className="text-gray-600 mb-6">다른 컨셉의 코스를 찾아보시거나 나중에 다시 확인해보세요.</p>
                        <Link
                            href="/"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
                        >
                            홈으로 돌아가기
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
