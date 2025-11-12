"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function NearbyPage() {
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    // 예산 기능 제거
    const [courses, setCourses] = useState<Course[]>([]);
    // 되돌림: 페이징 상태 제거
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hideClosedPlaces, setHideClosedPlaces] = useState(false);

    // 페이지 로드 시 스크롤을 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const fetchCourses = async () => {
            setLoading(true);
            setError(null);
            try {
                const concept = selectedActivities[0];
                const qs = new URLSearchParams();
                if (concept) qs.set("concept", concept);
                qs.set("limit", "200");
                qs.set("nocache", "1");
                // 코스 내 장소 이미지가 모두 있거나 1개만 없는 경우만 허용
                qs.set("imagePolicy", "all-or-one-missing");
                const res = await fetch(`/api/courses?${qs.toString()}`, { signal: controller.signal });
                const data = await res.json();
                if (!Array.isArray(data)) throw new Error("unexpected");
                setCourses(data as Course[]);
            } catch (e: any) {
                if (e?.name !== "AbortError") setError("데이터를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
        return () => controller.abort();
    }, [selectedActivities.join(",")]);

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

    const toggle = (arr: string[], v: string, set: (n: string[]) => void) => {
        if (arr.includes(v)) set(arr.filter((x) => x !== v));
        else set([...arr, v]);
    };

    // 활동은 단일 선택만 가능하도록 처리
    const selectSingle = (arr: string[], v: string, set: (n: string[]) => void) => {
        if (arr.includes(v)) set([]);
        else set([v]);
    };

    return (
        <div className="min-h-screen bg-white text-black">
            <section className="max-w-[500px] mx-auto px-4 pt-5 pb-12">
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
                                        onClick={() => selectSingle(selectedActivities, a.key, setSelectedActivities)}
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
                                        onClick={() => selectSingle(selectedRegions, r, setSelectedRegions)}
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
                                    onChange={(e) => setHideClosedPlaces(e.target.checked)}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700">휴무 코스 제외</span>
                            </label>
                        </div>

                        {/* 예산 기능 제거 */}
                    </aside>

                    {/* Right: Results */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-600">총 {filtered.length}개 결과</p>
                            <button
                                onClick={() => {
                                    setSelectedActivities([]);
                                    setSelectedRegions([]);
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
        </div>
    );
}
