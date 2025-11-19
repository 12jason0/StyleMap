"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import Image from "@/components/ImageFallback";
import { getPlaceStatus } from "@/lib/placeStatus";

type PlaceClosedDay = {
    day_of_week: number | null;
    specific_date: Date | string | null;
    note?: string | null;
};

type Place = {
    id: number;
    name: string;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
    opening_hours?: string | null;
    closed_days?: PlaceClosedDay[];
};

type CoursePlace = {
    order_index: number;
    place: Place | null;
};

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
    coursePlaces?: CoursePlace[];
}

function CoursesPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const concept = searchParams.get("concept");
    const recommended = searchParams.get("recommended");
    const q = (searchParams.get("q") || "").trim();
    const tagIdsParam = (searchParams.get("tagIds") || "").trim();
    const regionParam = (searchParams.get("region") || "").trim();
    const hideClosedParam = searchParams.get("hideClosed") === "1";

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hideClosedPlaces, setHideClosedPlaces] = useState(hideClosedParam);
    const [allTags, setAllTags] = useState<Array<{ id: number; name: string }>>([]);
    const [selectedTagId, setSelectedTagId] = useState<number | null>(() => {
        const first = (tagIdsParam || "")
            .split(",")
            .map((v) => Number(v))
            .find((n) => Number.isFinite(n));
        return Number.isFinite(first as any) ? (first as number) : null;
    });
    const [conceptInput, setConceptInput] = useState(concept || "");
    const [regionInput, setRegionInput] = useState(regionParam || "");
	const [searchInput, setSearchInput] = useState(q || "");
	const [showFilterModal, setShowFilterModal] = useState(false);

    // 페이지 로드 시 스크롤을 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // 태그 목록 로드
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/course-tags", { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (data?.success && Array.isArray(data.tags)) setAllTags(data.tags);
            } catch {}
        })();
    }, []);

	// tagIds/q/region 등의 파라미터로 직접 접근한 경우 /nearby로 리다이렉트
	useEffect(() => {
		if (recommended) return;
		const shouldRedirect = Boolean(tagIdsParam || q || regionParam || hideClosedParam);
		if (!shouldRedirect) return;
		const sp = new URLSearchParams();
		if (q) sp.set("q", q);
		if (concept) sp.set("concept", concept);
		if (tagIdsParam) sp.set("tagIds", tagIdsParam);
		if (regionParam) sp.set("region", regionParam);
		if (hideClosedParam) sp.set("hideClosed", "1");
		router.replace(`/nearby?${sp.toString()}`);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [recommended, tagIdsParam, q, regionParam, hideClosedParam, concept]);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);

                // 검색 파라미터 구성
                const sp = new URLSearchParams();
                sp.set("imagePolicy", "all-or-one-missing");
                sp.set("nocache", "1");
                if (concept) sp.set("concept", concept);
                if (q) sp.set("q", q);
                if (tagIdsParam) sp.set("tagIds", tagIdsParam);
                if (regionParam) sp.set("region", regionParam);

                const url = recommended ? `/api/recommendations?limit=8` : `/api/courses?${sp.toString()}`;

                // 캐시된 데이터 확인
                const cacheKey = `courses_${concept || "all"}_${q || "noq"}_${tagIdsParam || "notags"}_${regionParam || "noregion"}`;
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
    }, [concept, q, tagIdsParam, regionParam, recommended]);

    // 휴무인 장소가 있는 코스인지 확인하는 함수
    const hasClosedPlace = useMemo(() => {
        return (course: Course): boolean => {
            if (!course.coursePlaces || course.coursePlaces.length === 0) return false;

            return course.coursePlaces.some((cp) => {
                const place = cp.place;
                if (!place) return false;

                const status = getPlaceStatus(place.opening_hours || null, place.closed_days || []);
                return status.status === "휴무";
            });
        };
    }, []);

    // 필터링된 코스 목록
    const filteredCourses = useMemo(() => {
        if (!hideClosedPlaces) return courses;
        return courses.filter((course) => !hasClosedPlace(course));
    }, [courses, hideClosedPlaces, hasClosedPlace]);

	// 프리셋 칩 목록 (활동/지역)
	const activityChips = useMemo(
		() => [
			{ label: "카페투어", icon: "🫖" },
			{ label: "맛집탐방", icon: "🍷" },
			{ label: "쇼핑", icon: "🧴" },
			{ label: "문화예술", icon: "🎨" },
			{ label: "야경", icon: "🌃" },
			{ label: "테마파크", icon: "🎢" },
			{ label: "체험", icon: "🧪" },
			{ label: "이색데이트", icon: "✨" },
		],
		[]
	);
	const regionChips = useMemo(
		() => ["강남", "성수", "홍대", "종로", "연남", "한남", "서초", "건대", "송파", "신촌"],
		[]
	);

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
					<div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 font-brand">
                                {recommended ? "추천 코스" : concept ? `${concept} 코스` : "오늘 뭐하지"}
                            </h1>
                            <p className="text-gray-600 mt-2">
                                {recommended
                                    ? "당신을 위한 추천 코스"
                                    : concept
                                    ? `${concept} 관련 코스를 찾아보세요`
                                    : "다양한 코스를 둘러보세요"}
                            </p>
                        </div>
						<div>
							<button
								onClick={() => setShowFilterModal(true)}
								className="px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
								aria-label="검색 및 필터 열기"
							>
								검색/필터
							</button>
						</div>
                    </div>
					{/* 모달 트리거만 헤더에 두고, 실제 필터는 모달로 제공 */}
                </div>
            </div>

			{/* 검색/필터 모달 */}
			{showFilterModal && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-center">
					<div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-4 sm:p-6 shadow-xl">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-lg font-bold text-black">필터</h3>
							<button
								onClick={() => setShowFilterModal(false)}
								className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
								aria-label="닫기"
							>
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						{/* 검색어 */}
						<div className="mb-4">
							<label className="text-sm text-gray-700">검색어</label>
							<input
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="제목/설명/지역 등"
								className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
								aria-label="검색어 입력"
							/>
						</div>

						{/* 카테고리(메인과 동일 칩) */}
						<div className="mb-4">
							<div className="text-sm text-gray-700 mb-2">카테고리</div>
							<div className="flex flex-wrap gap-2">
								{allTags.map((t) => {
									const active = selectedTagId === t.id;
									return (
										<button
											key={t.id}
											onClick={() => setSelectedTagId(active ? null : t.id)}
											className={`px-3 py-1.5 rounded-full text-sm border transition ${
												active
													? "bg-emerald-600 text-white border-emerald-600"
													: "bg-white text-gray-700 border-gray-300"
											}`}
											aria-pressed={active}
										>
											#{t.name}
										</button>
									);
								})}
								{allTags.length === 0 && <span className="text-sm text-gray-500">태그 없음</span>}
							</div>
						</div>

						{/* 활동 선택 칩 */}
						<div className="mb-4">
							<div className="text-sm text-gray-700 mb-2">활동</div>
							<div className="flex flex-wrap gap-2">
								{activityChips.map((a) => {
									const active = conceptInput === a.label;
									return (
										<button
											key={a.label}
											onClick={() => setConceptInput(active ? "" : a.label)}
											className={`px-4 py-2 rounded-xl border transition flex items-center gap-2 ${
												active
													? "bg-emerald-50 text-emerald-700 border-emerald-200"
													: "bg-white text-gray-800 border-gray-200"
											}`}
										>
											<span className="text-base leading-none">{a.icon}</span>
											<span className="text-sm">{a.label}</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* 지역 선택 칩 */}
						<div className="mb-4">
							<div className="text-sm text-gray-700 mb-2">지역</div>
							<div className="flex flex-wrap gap-2">
								{regionChips.map((r) => {
									const active = regionInput === r;
									return (
										<button
											key={r}
											onClick={() => setRegionInput(active ? "" : r)}
											className={`px-4 py-2 rounded-full border transition ${
												active
													? "bg-gray-900 text-white border-gray-900"
													: "bg-white text-gray-800 border-gray-200"
											}`}
										>
											{r}
										</button>
									);
								})}
							</div>
						</div>

						<label className="flex items-center gap-2 cursor-pointer mb-4">
							<input
								type="checkbox"
								checked={hideClosedPlaces}
								onChange={(e) => setHideClosedPlaces(e.target.checked)}
								className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
							/>
							<span className="text-sm text-gray-700">휴무 코스 제외</span>
						</label>

						<div className="flex gap-2 justify-end">
							<button
								onClick={() => setShowFilterModal(false)}
								className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
							>
								닫기
							</button>
							<button
								onClick={() => {
									const sp = new URLSearchParams();
									if (searchInput.trim()) sp.set("q", searchInput.trim());
									if (conceptInput.trim()) sp.set("concept", conceptInput.trim());
									if (selectedTagId) sp.set("tagIds", String(selectedTagId));
									if (regionInput.trim()) sp.set("region", regionInput.trim());
									if (recommended) sp.set("recommended", String(recommended));
									if (hideClosedPlaces) sp.set("hideClosed", "1");
									setShowFilterModal(false);
									// 검색/카테고리 선택은 /nearby에서 처리
									router.push(`/nearby?${sp.toString()}`);
								}}
								className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
							>
								검색
							</button>
						</div>
					</div>
				</div>
			)}

            {/* 코스 목록 */}
            <div className="max-w-[500px] mx-auto px-4 py-8">
                <div className="grid grid-cols-1 gap-6">
                    {filteredCourses.map((course, idx) => (
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
                {filteredCourses.length === 0 && courses.length > 0 && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">필터링된 코스가 없습니다</h3>
                        <p className="text-gray-600 mb-6">
                            휴무인 장소가 있는 코스를 숨기는 필터를 해제하면 더 많은 코스를 볼 수 있습니다.
                        </p>
                        <button
                            onClick={() => setHideClosedPlaces(false)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
                        >
                            필터 해제하기
                        </button>
                    </div>
                )}
                {filteredCourses.length === 0 && courses.length === 0 && concept && (
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

                {filteredCourses.length === 0 && courses.length === 0 && !concept && (
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
