"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "@/components/ImageFallback";

interface Course {
    id: string;
    title: string;
    description: string;
    duration: string;
    location: string;
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
    const router = useRouter();
    const concept = searchParams.get("concept");
    const recommended = searchParams.get("recommended");

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

                const url = recommended
                    ? `/api/recommendations?limit=8`
                    : concept
                    ? `/api/courses?concept=${encodeURIComponent(concept)}&imagePolicy=all-or-one-missing&nocache=1`
                    : "/api/courses?imagePolicy=all-or-one-missing&nocache=1";

                // 캐시된 데이터 확인
                const cacheKey = `courses_${concept || "all"}`;
                const cachedData = sessionStorage.getItem(cacheKey);
                const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
                const now = Date.now();

                if (cachedData && cacheTime && now - parseInt(cacheTime) < 1 * 60 * 1000) {
                    const data = JSON.parse(cachedData);
                    setCourses(Array.isArray(data) ? data : []);
                    setError(null);
                    setLoading(false);
                    return;
                }

                const response = await fetch(url, {
                    cache: "force-cache",
                    next: { revalidate: 180 },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch courses");
                }

                const data = await response.json();

                // 추천 모드면 recommendations 배열 사용 → 화면 공통 형태로 매핑(viewCount 채움)
                const normalized = recommended
                    ? Array.isArray(data?.recommendations)
                        ? data.recommendations
                        : []
                    : Array.isArray(data)
                    ? data
                    : data.courses || [];

                const unified = normalized.map((item: any) => ({
                    ...item,
                    viewCount: (item?.viewCount ?? item?.view_count ?? 0) as number,
                }));
                setCourses(unified);

                setError(null);

                sessionStorage.setItem(cacheKey, JSON.stringify(normalized));
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

    // ✅ "코스 시작하기" 버튼 핸들러
    const handleStartCourse = (e: React.MouseEvent, courseId: string) => {
        e.stopPropagation();

        const token = localStorage.getItem("authToken");
        if (!token) {
            alert("로그인이 필요합니다.");
            router.push("/login");
            return;
        }

        router.push(`/courses/${courseId}/start`);
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
        <div className="min-h-screen bg-gray-50 ">
            {/* 헤더 */}
            <div className="bg-white shadow-sm">
                <div className="max-w-[500px] mx-auto px-4 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 font-brand">
                                {recommended ? "추천 코스" : concept ? `${concept} 코스` : "모든 코스"}
                            </h1>
                            <p className="text-gray-600 mt-2">
                                {recommended
                                    ? "당신을 위한 추천 코스"
                                    : concept
                                    ? `${concept} 관련 코스를 찾아보세요`
                                    : "다양한 코스를 둘러보세요"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 코스 목록 */}
            <div className="max-w-[500px] mx-auto px-4 py-8">
                <div className="grid grid-cols-1 gap-6">
                    {courses.map((course, idx) => (
                        <div
                            key={course.id}
                            className="bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-all cursor-pointer block"
                            onClick={async () => {
                                try {
                                    fetch(`/api/courses/${course.id}/view`, { method: "POST", keepalive: true }).catch(
                                        () => {}
                                    );
                                } catch {}
                                window.location.href = `/courses/${course.id}`;
                            }}
                        >
                            {/* 이미지 */}
                            <div className="relative h-36 rounded-t-2xl overflow-hidden">
                                <Image
                                    src={course.imageUrl || ""}
                                    alt={course.title}
                                    fill
                                    sizes="100vw"
                                    priority={idx === 0}
                                    className="object-cover"
                                />
                                <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                    {course.concept}
                                </div>
                            </div>

                            {/* 내용 */}
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-gray-900 ">{course.title}</h3>
                                </div>
                                <div className="flex items-center text-sm text-gray-700 mb-2">
                                    <span className="text-yellow-500">★</span>
                                    <span className="ml-1">{course.rating}</span>
                                    <span className="ml-1">({course.reviewCount})</span>
                                </div>

                                {/* 조회수 */}
                                <div className="flex items-center text-sm text-gray-500 mb-2 gap-2">
                                    <span>👁️</span>
                                    <span className="tabular-nums">
                                        {(course.viewCount || 0).toLocaleString()}회 조회
                                    </span>
                                </div>

                                <p
                                    className="text-gray-600 mb-3"
                                    style={{
                                        display: "-webkit-box",
                                        WebkitLineClamp: 1,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                    }}
                                >
                                    {course.description}
                                </p>

                                {/* 정보 태그 */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                                        ⏱ {course.duration}
                                    </span>
                                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                                        📍 {course.location}
                                    </span>
                                </div>

                                {/* 참가자 수 */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-blue-600 font-medium">
                                        👥 지금 {course.participants}명 진행중
                                    </span>
                                    <button
                                        onClick={(e) => handleStartCourse(e, course.id)}
                                        className="rounded-full text-xs px-3 py-1.5 active:scale-95 text-white"
                                        style={{ backgroundColor: "var(--brand-green)" }}
                                    >
                                        시작하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 코스 없을 때 */}
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
