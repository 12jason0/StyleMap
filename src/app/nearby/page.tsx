"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
    const [budget, setBudget] = useState<number>(10);
    const [courses, setCourses] = useState<Course[]>([]);
    // 되돌림: 페이징 상태 제거
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const filtered = useMemo(() => {
        const maxWon = budget * 10000;
        const toWon = (price?: string) => {
            if (!price) return null;
            const d = price.replace(/[^0-9]/g, "");
            return d ? Number(d) : null;
        };
        return courses.filter((c) => {
            if (selectedActivities.length > 0 && !selectedActivities.some((a) => (c.concept || "").includes(a))) {
                return false;
            }
            if (selectedRegions.length > 0) {
                const loc = (c.location || c.region || "").toLowerCase();
                if (!selectedRegions.some((r) => loc.includes(r.toLowerCase()))) return false;
            }
            const won = toWon(c.price);
            if (won !== null && won > maxWon) return false;
            return true;
        });
    }, [courses, selectedActivities, selectedRegions, budget]);

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
            <section
                className="max-w-[500px] mx-auto px-4 pt-5 pb-12 overflow-y-auto overscroll-contain no-scrollbar scrollbar-hide"
                style={{ maxHeight: "calc(100vh - 80px)" }}
            >
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

                        {/* 예산 */}
                        <div className="mb-2">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">예산 (최대)</h3>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={3}
                                    max={30}
                                    step={1}
                                    value={budget}
                                    onChange={(e) => setBudget(Number(e.target.value))}
                                    className="w-full hover:cursor-pointer"
                                />
                                <span className="text-sm text-gray-700 whitespace-nowrap ">{budget}만원</span>
                            </div>
                        </div>
                    </aside>

                    {/* Right: Results */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-600">총 {filtered.length}개 결과</p>
                            <button
                                onClick={() => {
                                    setSelectedActivities([]);
                                    setSelectedRegions([]);
                                    setBudget(10);
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
                                            <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-100 mb-3">
                                                {c.imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={c.imageUrl}
                                                        alt={c.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-2xl">
                                                        📷
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
