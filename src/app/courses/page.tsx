"use client";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";

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
    viewCount: number;
    creator?: {
        id: string;
        name: string;
    };
}

function CoursesPageInner() {
    const searchParams = useSearchParams();
    const concept = searchParams.get("concept");
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 페이지 로드 시 스크롤을 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);

                const url = concept
                    ? `/api/courses?concept=${encodeURIComponent(concept)}&imagePolicy=all-or-one-missing&nocache=1`
                    : "/api/courses?imagePolicy=all-or-one-missing&nocache=1";

                // 캐시된 데이터 확인
                const cacheKey = `courses_${concept || "all"}`;
                const cachedData = sessionStorage.getItem(cacheKey);
                const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
                const now = Date.now();

                // 3분 이내 캐시된 데이터가 있으면 사용
                if (cachedData && cacheTime && now - parseInt(cacheTime) < 1 * 60 * 1000) {
                    const data = JSON.parse(cachedData);
                    setCourses(data);
                    setError(null);
                    setLoading(false);
                    return;
                }

                const response = await fetch(url, {
                    cache: "force-cache",
                    next: { revalidate: 180 }, // 3분 캐시
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch courses");
                }

                const data = await response.json();
                if (data && Array.isArray(data.courses)) {
                    setCourses(data.courses);
                } else {
                    // 혹시 모를 다른 형식의 응답에 대비
                    setCourses(data);
                }

                setError(null);

                // 데이터를 캐시에 저장
                sessionStorage.setItem(cacheKey, JSON.stringify(data));
                sessionStorage.setItem(`${cacheKey}_time`, now.toString());
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
            const token = localStorage.getItem("authToken");
            if (!token) {
                alert("로그인이 필요합니다.");
                return;
            }

            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    courseId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "예약에 실패했습니다.");
            }

            alert("코스 예약이 완료되었습니다!");

            // 코스 목록 새로고침
            const url = concept
                ? `/api/courses?concept=${encodeURIComponent(concept)}&imagePolicy=all-or-one-missing`
                : "/api/courses?imagePolicy=all-or-one-missing";
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
                    <button onClick={() => window.location.reload()} className="btn-primary rounded-full">
                        다시 시도하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-15">
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
                        <Link href="/" className="btn-primary rounded-full">
                            ← 홈으로
                        </Link>
                    </div>
                </div>
            </div>

            {/* 코스 목록 */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <div
                            key={course.id}
                            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer block"
                            onClick={async () => {
                                try {
                                    // 조회수 증가 비동기 전송 (내비게이션 비차단)
                                    fetch(`/api/courses/${course.id}/view`, { method: "POST", keepalive: true }).catch(
                                        () => {}
                                    );
                                } catch {}
                                // 코스 상세 페이지로 즉시 이동
                                window.location.href = `/courses/${course.id}`;
                            }}
                        >
                            {/* 이미지 */}
                            <div className="relative h-48 rounded-t-2xl overflow-hidden">
                                {course.imageUrl ? (
                                    <Image
                                        src={course.imageUrl}
                                        alt={course.title}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 33vw"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white" />
                                )}
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

                                {/* 조회수 표시 */}
                                <div className="flex items-center text-sm text-gray-500 mb-3">
                                    <span className="mr-2">👁️</span>
                                    <span>{(course.viewCount || 0).toLocaleString()}회 조회</span>
                                </div>

                                <p
                                    className="text-gray-600 mb-4"
                                    style={{
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                    }}
                                >
                                    {course.description}
                                </p>

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
                                        className="btn-primary rounded-full text-sm active:scale-95"
                                    >
                                        코스 시작하기
                                    </button>
                                    <a
                                        href={`https://www.google.com/search?q=${encodeURIComponent(course.title)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="btn-secondary rounded-full text-sm active:scale-95 ml-2"
                                        title="공식 웹사이트 또는 정보 검색"
                                    >
                                        웹사이트
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {courses.length === 0 && concept && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🚧</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{concept} 코스 준비중입니다</h3>
                        <p className="text-gray-600 mb-6">
                            {concept} 관련 코스를 준비하고 있습니다. 곧 만나보실 수 있어요!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href={`/coming-soon?concept=${encodeURIComponent(concept)}`}
                                className="btn-primary rounded-full"
                            >
                                자세히 보기
                            </Link>
                            <Link
                                href="/courses"
                                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
                            >
                                다른 코스 둘러보기
                            </Link>
                        </div>
                    </div>
                )}

                {courses.length === 0 && !concept && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🚧</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">코스를 찾을 수 없습니다</h3>
                        <p className="text-gray-600 mb-6">다른 컨셉의 코스를 찾아보시거나 나중에 다시 확인해보세요.</p>
                        <Link href="/" className="btn-primary rounded-full">
                            홈으로 돌아가기
                        </Link>
                    </div>
                )}
            </div>
            {/* 모바일 하단 네비게이션을 위한 여백 */}
            <div className="md:hidden h-20"></div>
        </div>
    );
}

export default function CoursesPage() {
    return (
        <Suspense
            fallback={<div className="min-h-screen flex items-center justify-center text-gray-600">로딩 중...</div>}
        >
            <CoursesPageInner />
        </Suspense>
    );
}
