"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "@/components/ImageFallback";
import { getPlaceStatus } from "@/lib/placeStatus";

const tagCategories: Record<string, string[]> = {
    분위기: [
        "#힙스터",
        "#감성",
        "#로맨틱",
        "#캐주얼",
        "#럭셔리",
        "#빈티지",
        "#모던",
        "#전통",
        "#이국적",
        "#아늑한",
        "#힐링",
        "#프리미엄",
    ],
    특징: [
        "#사진촬영",
        "#인생샷",
        "#인스타",
        "#SNS인증",
        "#포토존",
        "#핫플",
        "#숨은명소",
        "#요즘핫한",
        "#신상",
        "#가성비",
        "#무료",
        "#비오는날",
        "#야경",
        "#실내",
        "#야외",
        "#한강",
    ],
    장소: ["#카페", "#레스토랑", "#전시관람", "#공연관람", "#방탈출", "#루프탑", "#복합문화공간", "#플래그십"],
    기타: [
        "#데이트",
        "#혼자",
        "#친구",
        "#기념일",
        "#첫만남",
        "#문화생활",
        "#산책",
        "#체험",
        "#쇼핑",
        "#맛집투어",
        "#카페투어",
        "#액티비티",
        "#미식",
        "#브런치",
        "#술집투어",
    ],
};

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

type Course = {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    concept?: string;
    region?: string;
    distance?: number;
    start_place_name?: string;
    location?: string;
    price?: string;
    duration?: string;
    coursePlaces?: CoursePlace[];
};

const activities = [
    { key: "카페투어", label: "☕ 카페투어" },
    { key: "맛집탐방", label: "🍜 맛집탐방" },
    { key: "쇼핑", label: "🛍️ 쇼핑" },
    { key: "문화예술", label: "🎨 문화예술" },
    { key: "야경", label: "🌃 야경" },
    { key: "테마파크", label: "🎢 테마파크" },
    { key: "체험", label: "🧪 체험" },
    { key: "이색데이트", label: "✨ 이색데이트" },
];

const regions = ["강남", "성수", "홍대", "종로", "연남", "한남", "서초", "건대", "송파", "신촌"];

import { useSearchParams, useRouter } from "next/navigation";

export default function NearbyPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // 검색과 선택은 독립 동작: 자동 지역 매핑은 사용하지 않음

    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [modalSelectedLabels, setModalSelectedLabels] = useState<string[]>([]);
    // URL 파라미터 기반 초기값 즉시 반영
    const [selectedActivities, setSelectedActivities] = useState<string[]>(() => {
        const c = (searchParams.get("concept") || "").trim();
        return c ? [c] : [];
    });
    const [selectedRegions, setSelectedRegions] = useState<string[]>(() => {
        const r = (searchParams.get("region") || "").trim();
        return r ? [r] : [];
    });
    // 예산 기능 제거
    const [courses, setCourses] = useState<Course[]>([]);
    // 되돌림: 페이징 상태 제거
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hideClosedPlaces, setHideClosedPlaces] = useState<boolean>(() => searchParams.get("hideClosed") === "1");
    const [searchInput, setSearchInput] = useState<string>(() => (searchParams.get("q") || "").trim());
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>(() => {
        return (searchParams.get("tagIds") || "")
            .split(",")
            .map((v) => Number(v))
            .filter((n) => Number.isFinite(n) && n > 0);
    });
    const [allTags, setAllTags] = useState<Array<{ id: number; name: string }>>([]);
    // 강제 재조회 트리거(초기화 등)
    const [refreshNonce, setRefreshNonce] = useState(0);

    // 페이지 로드 시 스크롤을 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // 메인에서 /nearby?q=... 로 진입하거나 q 값이 바뀐 경우 동기화
    useEffect(() => {
        const q = (searchParams.get("q") || "").trim();
        if (q && q !== searchInput) {
            setSelectedRegions([]);
            setSelectedActivities([]);
            setSelectedTagIds([]);
            setSearchInput(q);
            setCourses([]);
            setRefreshNonce((n) => n + 1);
        }
    }, [searchParams, searchInput]);

    // 태그 목록 불러오기 (이름 -> id 매핑에 사용)
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/course-tags", { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (data?.success && Array.isArray(data.tags)) setAllTags(data.tags);
            } catch {}
        })();
    }, []);

    // 모달 열릴 때 현재 선택된 tagIds를 라벨 형태로 반영
    useEffect(() => {
        if (!showCategoryModal) return;
        if (!allTags || allTags.length === 0) return;
        const labels = allTags
            .filter((t) => selectedTagIds.includes(t.id))
            .map((t) => `#${String(t.name || "").trim()}`);
        setModalSelectedLabels(labels);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showCategoryModal, allTags]);

    const handleCategoryClick = (raw: string) => {
        // 모달 내부에서는 토글 선택 (다중 선택)
        const exists = modalSelectedLabels.includes(raw);
        setModalSelectedLabels((prev) => (exists ? prev.filter((x) => x !== raw) : [...prev, raw]));
    };

    // 모달 적용
    const applyCategorySelection = () => {
        // 라벨 -> 태그 ID 매핑
        const ids = Array.from(
            new Set(
                modalSelectedLabels
                    .map((raw) =>
                        String(raw || "")
                            .replace(/^#/, "")
                            .trim()
                    )
                    .map((name) => allTags.find((t) => String(t?.name || "").trim() === name)?.id)
                    .filter((id): id is number => Number.isFinite(id as any) && (id as any) > 0)
            )
        );
        const finalIds = ids; // 매핑 실패 시에도 잘못된 ID를 넣지 않음
        setSelectedTagIds(finalIds);

        const sp = new URLSearchParams();
        if (finalIds.length > 0) sp.set("tagIds", String(finalIds.join(",")));
        if (selectedActivities[0]) sp.set("concept", selectedActivities[0]);
        if (selectedRegions[0]) sp.set("region", selectedRegions[0]);
        if (searchInput.trim()) sp.set("q", searchInput.trim());
        if (hideClosedPlaces) sp.set("hideClosed", "1");
        setShowCategoryModal(false);
        router.push(`/nearby?${sp.toString()}`);
    };

    useEffect(() => {
        const controller = new AbortController();
        const fetchCourses = async () => {
            setLoading(true);
            setError(null);
            try {
                const concept = selectedActivities[0];
                const qs = new URLSearchParams();
                if (concept) qs.set("concept", concept);
                if (searchInput.trim()) qs.set("q", searchInput.trim());
                if (selectedRegions.length > 0) qs.set("region", selectedRegions[0]);
                const validTagIds = selectedTagIds.filter((id) => Number.isFinite(id) && id > 0);
                if (validTagIds.length > 0) qs.set("tagIds", validTagIds.join(","));
                // 충분히 여유 있게 요청 (현재 전체 60개 기준)
                qs.set("limit", "200");
                qs.set("nocache", "1");
                // 이미지 정책 완화: 필터 유무와 관계없이 기본값을 'any'로 사용해 결과 누락 방지
                qs.set("imagePolicy", "any");

                const res = await fetch(`/api/courses?${qs.toString()}`, {
                    signal: controller.signal,
                    cache: "no-store",
                });
                const data = await res.json().catch(() => null);
                let list: Course[] = Array.isArray(data)
                    ? (data as Course[])
                    : Array.isArray((data as any)?.courses)
                    ? ((data as any).courses as Course[])
                    : [];

                // 최종 안전망: '필터가 전혀 없을 때'만 전체 호출
                if (
                    list.length === 0 &&
                    selectedActivities.length === 0 &&
                    selectedRegions.length === 0 &&
                    selectedTagIds.length === 0 &&
                    !searchInput.trim()
                ) {
                    const fb2 = new URLSearchParams();
                    fb2.set("limit", "200");
                    fb2.set("imagePolicy", "any");
                    fb2.set("nocache", "1");
                    const res3 = await fetch(`/api/courses?${fb2.toString()}`, {
                        signal: controller.signal,
                        cache: "no-store",
                    });
                    const data3 = await res3.json().catch(() => null);
                    list = Array.isArray(data3)
                        ? (data3 as Course[])
                        : Array.isArray((data3 as any)?.courses)
                        ? ((data3 as any).courses as Course[])
                        : [];
                }
                setCourses(list);
            } catch (e: any) {
                // 네트워크/서버 오류 시에도 기본 목록을 시도
                try {
                    const fb2 = new URLSearchParams();
                    fb2.set("limit", "200");
                    fb2.set("imagePolicy", "any");
                    fb2.set("nocache", "1");
                    const res3 = await fetch(`/api/courses?${fb2.toString()}`, {
                        signal: controller.signal,
                        cache: "no-store",
                    });
                    const data3 = await res3.json().catch(() => null);
                    const list: Course[] = Array.isArray(data3)
                        ? (data3 as Course[])
                        : Array.isArray((data3 as any)?.courses)
                        ? ((data3 as any).courses as Course[])
                        : [];
                    setCourses(list);
                    setError(null);
                } catch (err) {
                    if (e?.name !== "AbortError") setError("데이터를 불러오지 못했습니다.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
        return () => controller.abort();
    }, [
        selectedActivities.join(","),
        searchInput,
        selectedRegions.join(","),
        selectedTagIds.join(","),
        hideClosedPlaces,
        refreshNonce,
    ]);


    // 되돌림: 필터 변경에 따른 페이징 초기화 제거

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

    // 휴무인 장소 개수를 계산하는 함수
    const getClosedPlaceCount = useMemo(() => {
        return (course: Course): number => {
            if (!course.coursePlaces || course.coursePlaces.length === 0) return 0;

            return course.coursePlaces.filter((cp) => {
                const place = cp.place;
                if (!place) return false;

                const status = getPlaceStatus(place.opening_hours || null, place.closed_days || []);
                return status.status === "휴무";
            }).length;
        };
    }, []);

    const filtered = useMemo(() => {
        return courses.filter((c) => {
            if (selectedActivities.length > 0 && !selectedActivities.some((a) => (c.concept || "").includes(a))) {
                return false;
            }
            if (selectedRegions.length > 0) {
                const loc = (c.location || c.region || "").toLowerCase();
                if (!selectedRegions.some((r) => loc.includes(r.toLowerCase()))) return false;
            }
            // 휴무인 장소가 있는 코스 필터링
            if (hideClosedPlaces && hasClosedPlace(c)) {
                return false;
            }
            return true;
        });
    }, [courses, selectedActivities, selectedRegions, hideClosedPlaces, hasClosedPlace]);

    const pushUrlFromState = (next?: {
        activities?: string[];
        regions?: string[];
        hideClosed?: boolean;
        tagIds?: number[];
        q?: string;
    }) => {
        const sp = new URLSearchParams();
        const acts = next?.activities ?? selectedActivities;
        const regs = next?.regions ?? selectedRegions;
        const tags = next?.tagIds ?? selectedTagIds;
        const q = next?.q ?? searchInput;
        const hide = next?.hideClosed ?? hideClosedPlaces;
        if (q && q.trim()) sp.set("q", q.trim());
        if (acts[0]) sp.set("concept", acts[0]);
        if (regs[0]) sp.set("region", regs[0]);
        if (tags.length > 0) sp.set("tagIds", String(tags.join(",")));
        if (hide) sp.set("hideClosed", "1");
        const url = sp.toString() ? `/nearby?${sp.toString()}` : "/nearby";
        router.replace(url);
    };

    // 활동/지역 단일 선택 토글 핸들러 (URL 동기화 포함)
    const toggleActivitySingle = (value: string) => {
        const next = selectedActivities.includes(value) ? [] : [value];
        setSelectedActivities(next);
        pushUrlFromState({ activities: next });
    };

    const toggleRegionSingle = (value: string) => {
        const next = selectedRegions.includes(value) ? [] : [value];
        setSelectedRegions(next);
        // 지역 선택 시: 검색어/활동/태그 초기화 후 지역만 적용
        setSearchInput("");
        setSelectedActivities([]);
        setSelectedTagIds([]);
        setCourses([]);
        pushUrlFromState({ regions: next, q: "", activities: [], tagIds: [] });
    };

    return (
        <div className="min-h-screen bg-white text-black">
            <section className="max-w-[500px] mx-auto px-4 pt-5 pb-12">
                <div className="flex gap-2 pb-5">
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="코스 검색 (제목/컨셉/지역)"
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                        aria-label="코스 검색"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                // 검색 실행 시: 지역/활동/태그 초기화 후 q만 적용
                                const q = searchInput.trim();
                                setSelectedRegions([]);
                                setSelectedActivities([]);
                                setSelectedTagIds([]);
                                setCourses([]);
                                pushUrlFromState({ regions: [], activities: [], tagIds: [], q });
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            // 검색 실행 시: 지역/활동/태그 초기화 후 q만 적용
                            const q = searchInput.trim();
                            setSelectedRegions([]);
                            setSelectedActivities([]);
                            setSelectedTagIds([]);
                            setCourses([]);
                            pushUrlFromState({ regions: [], activities: [], tagIds: [], q });
                        }}
                        className="px-3 py-2 rounded-xl text-sm font-semibold border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        aria-label="검색 실행"
                    >
                        검색
                    </button>
                </div>
                {/* 선택된 카테고리 미리보기 (검색창 아래 노출) */}
                {selectedTagIds.length > 0 && (
                    <div className="mb-4 -mt-3">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar scrollbar-hide pb-1 -mx-1 px-1">
                            {selectedTagIds
                                .map((id) => allTags.find((t) => t.id === id)?.name)
                                .filter((n): n is string => Boolean(n))
                                .map((name) => (
                                    <span
                                        key={name}
                                        className="shrink-0 px-3 py-1.5 rounded-full text-sm border bg-emerald-50 text-emerald-700 border-emerald-200"
                                    >
                                        #{name}
                                    </span>
                                ))}
                        </div>
                    </div>
                )}
                <div className="flex flex-col gap-6">
                    {/* Left: Control panel */}
                    <aside className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                        <h2 className="text-lg font-bold mb-4">인기 지역 코스 필터</h2>
                        {/* 활동 선택 */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">활동 선택</h3>
                            <div className="flex flex-wrap gap-2">
                                {activities.map((a) => (
                                    <button
                                        key={a.key}
                                        onClick={() => toggleActivitySingle(a.key)}
                                        className={`px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 hover:cursor-pointer   ${
                                            selectedActivities.includes(a.key)
                                                ? "border-blue-500 text-blue-600 bg-blue-50"
                                                : "border-gray-300 text-gray-700"
                                        }`}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 지역 선택 */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">지역 선택</h3>
                            <div className="flex flex-wrap gap-2">
                                {regions.map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => toggleRegionSingle(r)}
                                        className={`px-3 py-1.5 rounded-full border text-sm hover:bg-gray-50 hover:cursor-pointer ${
                                            selectedRegions.includes(r)
                                                ? "border-blue-500 text-blue-600 bg-blue-50"
                                                : "border-gray-300 text-gray-700"
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 휴무 장소 필터 체크박스 */}
                        <div className="mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={hideClosedPlaces}
                                    onChange={(e) => {
                                        const next = e.target.checked;
                                        setHideClosedPlaces(next);
                                        pushUrlFromState({ hideClosed: next });
                                    }}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700">휴무 코스 제외</span>
                            </label>
                        </div>

                        {/* 예산 기능 제거 */}
                    </aside>

                    {/* 상단 간단 검색바 */}

                    {/* 인기 지역 코스 필터 - 카테고리 모달 트리거 */}
                    <div className="mt-4">
                        <button
                            onClick={() => setShowCategoryModal(true)}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-semibold"
                        >
                            인기 지역 코스 필터
                        </button>
                    </div>

                    {/* Right: Results */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-600">총 {filtered.length}개 결과</p>
                            <button
                                onClick={() => {
                                    // 상태 초기화
                                    setSelectedActivities([]);
                                    setSelectedRegions([]);
                                    setSelectedTagIds([]);
                                    setSearchInput("");
                                    setHideClosedPlaces(false);
                                    // URL도 초기화하여 북마크/새로고침 일관성 유지
                                    router.push("/nearby");
                                    // 즉시 재조회 트리거
                                    setRefreshNonce((n) => n + 1);
                                }}
                                className="text-sm text-gray-600 hover:text-gray-800 border px-3 py-1.5 rounded-lg hover:cursor-pointer "
                            >
                                초기화
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-gray-500">불러오는 중...</div>
                        ) : error ? (
                            <div className="p-8 text-center text-red-500">{error}</div>
                        ) : filtered.length === 0 ? (
                            <div className="p-10 text-center text-gray-600">조건에 맞는 코스가 없습니다.</div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-4">
                                    {filtered.map((c) => (
                                        <Link
                                            key={c.id}
                                            href={`/courses/${c.id}`}
                                            prefetch={true}
                                            className="block border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-100 mb-3 relative">
                                                <Image
                                                    src={c.imageUrl || ""}
                                                    alt={c.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                                {/* 휴무 장소 경고 배지 */}
                                                {hasClosedPlace(c) && (
                                                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                        <svg
                                                            className="w-3 h-3"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                            />
                                                        </svg>
                                                        <span>{getClosedPlaceCount(c)}곳 휴무</span>
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{c.title}</h3>
                                            <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                                                {c.location && <span>📍 {c.location}</span>}
                                                {c.duration && <span>⏱ {c.duration}</span>}
                                                {c.price && <span>💰 {c.price}</span>}
                                                {c.concept && <span>🏷 {c.concept}</span>}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                {/* 되돌림: 더보기 버튼 제거 */}
                            </>
                        )}
                    </section>
                </div>
            </section>
            <div className="md:hidden h-20"></div>

            {/* 카테고리 모달 */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-center">
                    <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-4 sm:p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-black">인기 지역 코스 필터</h3>
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                aria-label="닫기"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* 카테고리 그룹 (가로 스크롤, 스크롤바 숨김) */}
                        <div className="space-y-4">
                            {Object.entries(tagCategories).map(([group, tags]) => (
                                <div key={group} className="space-y-2">
                                    <div className="text-sm font-semibold text-gray-800">{group}</div>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar scrollbar-hide pb-1 -mx-1 px-1">
                                        {tags.map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => handleCategoryClick(t)}
                                                className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition ${
                                                    modalSelectedLabels.includes(t)
                                                        ? "bg-emerald-600 text-white border-emerald-600"
                                                        : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between mt-4">
                            <button
                                onClick={() => setModalSelectedLabels([])}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                선택 해제
                            </button>
                            <button
                                onClick={applyCategorySelection}
                                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                적용
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
