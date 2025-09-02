"use client";

import { useEffect, useState } from "react";

type TagCoursePlace = {
    order: number;
    id: number;
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    category?: string;
    imageUrl?: string;
};

type TagCourse = {
    id: string;
    title: string;
    concept: string;
    places: TagCoursePlace[];
};

export default function TagCoursesPage() {
    const [tags, setTags] = useState<string[]>([]);
    const [regions, setRegions] = useState<string[]>([]);
    const [selectedRegion, setSelectedRegion] = useState<string>("");
    const [selectedTag, setSelectedTag] = useState<string>("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<TagCourse[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        const loadTags = async (regionParam?: string) => {
            try {
                const url = regionParam
                    ? `/api/places/tags?region=${encodeURIComponent(regionParam)}`
                    : "/api/places/tags";
                const res = await fetch(url, { cache: "no-store" });
                const data = await res.json();
                if (data.success) {
                    setTags(data.tags || []);
                }
            } catch (e) {
                console.error(e);
            }
        };
        const loadRegions = async () => {
            try {
                const res = await fetch("/api/places/regions", { cache: "no-store" });
                const data = await res.json();
                if (data.success) setRegions(data.regions || []);
            } catch (e) {}
        };
        loadTags();
        loadRegions();
    }, []);

    // 지역 변경 시 해당 지역에 한정된 태그 다시 로드
    useEffect(() => {
        (async () => {
            try {
                const url = selectedRegion
                    ? `/api/places/tags?region=${encodeURIComponent(selectedRegion)}`
                    : "/api/places/tags";
                const res = await fetch(url, { cache: "no-store" });
                const data = await res.json();
                if (data.success) setTags(data.tags || []);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [selectedRegion]);

    const generateForSingleTag = async (tag: string, count: number, region?: string) => {
        try {
            const qs = new URLSearchParams({ tag, count: String(count), places: "4" });
            if (region) qs.append("region", region);
            const res = await fetch(`/api/courses/generate?${qs.toString()}`, {
                cache: "no-store",
            });
            const data = await res.json();
            if (!(res.ok && data.success)) {
                setError(data.error || "생성 실패");
                return [] as TagCourse[];
            }
            return (data.courses || []) as TagCourse[];
        } catch (e) {
            setError("네트워크 오류가 발생했습니다.");
            return [] as TagCourse[];
        }
    };

    const generateCourses = async () => {
        if (selectedTags.length === 0) {
            setNotice("태그를 선택해 주세요 (최대 3개)");
            return;
        }
        setCourses([]);
        setLoading(true);
        setError(null);
        setNotice(null);

        const counts = selectedTags.length === 1 ? [3] : selectedTags.length === 2 ? [2, 1] : [1, 1, 1];

        try {
            const results = await Promise.all(
                selectedTags.map(async (t, i) => {
                    const list = await generateForSingleTag(t, counts[i] || 0, selectedRegion || undefined);
                    if (selectedRegion) {
                        return list.filter((c) => c.places.some((p) => (p.address || "").includes(selectedRegion)));
                    }
                    return list;
                })
            );
            setCourses(results.flat());
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-black pt-24 px-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">카테고리 기반 즉석 코스</h1>
                <p className="text-gray-600 mb-6">
                    지역 · 컨셉(태그) · 그 외로 나눠 선택하세요. 선택한 지역 중심으로 코스를 생성합니다.
                </p>

                {/* 지역 선택 */}
                <div className="mb-6">
                    <h2 className="font-semibold mb-2">지역</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 hover:cursor-pointer">
                        {regions.slice(0, 18).map((r) => (
                            <button
                                key={r}
                                onClick={() => setSelectedRegion(r === selectedRegion ? "" : r)}
                                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                                    selectedRegion === r
                                        ? "border-green-500 text-green-600 bg-green-50"
                                        : "border-gray-200 hover:bg-green-50"
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    {regions.length > 18 && <div className="text-xs text-gray-500 mt-1">상위 18개 지역만 표시 중</div>}
                </div>

                {/* 컨셉(태그) */}
                <h2 className="font-semibold mb-2">컨셉</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-4">
                    {(showAll ? tags : tags.slice(0, 12)).map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        const canSelectMore = isSelected || selectedTags.length < 3;
                        return (
                            <button
                                key={tag}
                                onClick={() => {
                                    setSelectedTag(tag);
                                    setNotice(null);
                                    setSelectedTags((prev) => {
                                        const exists = prev.includes(tag);
                                        if (exists) return prev.filter((t) => t !== tag);
                                        if (prev.length >= 3) {
                                            setNotice("태그는 최대 3개까지 선택 가능합니다.");
                                            return prev;
                                        }
                                        return [...prev, tag];
                                    });
                                }}
                                disabled={!canSelectMore}
                                className={`px-3 py-2 rounded-lg border text-sm transition-colors hover:cursor-pointer ${
                                    isSelected
                                        ? "border-blue-500 text-blue-600 bg-blue-50"
                                        : canSelectMore
                                        ? "border-gray-200 hover:bg-blue-50"
                                        : "border-gray-200 opacity-60 cursor-not-allowed"
                                }`}
                            >
                                {tag}
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-3 mb-6">
                    {tags.length > 12 && (
                        <button
                            onClick={() => setShowAll((v) => !v)}
                            className="text-sm text-blue-600 hover:underline hover:cursor-pointer"
                        >
                            {showAll ? "접기" : "더보기"}
                        </button>
                    )}
                    <div className="text-sm text-gray-600">선택: {selectedTags.length}/3</div>
                    {notice && <div className="text-sm text-red-500">{notice}</div>}
                </div>

                <div className="flex items-center gap-2 mb-8">
                    <button
                        onClick={generateCourses}
                        className="hover:cursor-pointer px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                    >
                        선택한 태그로 코스 생성
                    </button>
                    {selectedTags.length > 0 && (
                        <button
                            onClick={() => {
                                setSelectedTags([]);
                                setCourses([]);
                            }}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                        >
                            선택 초기화
                        </button>
                    )}
                </div>

                {/* 결과 섹션 */}
                {loading && <div className="p-6">생성 중...</div>}
                {error && <div className="p-6 text-red-600">{error}</div>}

                {!loading && !error && courses.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <div
                                key={course.id}
                                className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-20"
                            >
                                <div className="p-4 border-b flex items-center justify-between">
                                    <h3 className="font-bold text-lg">{course.title}</h3>
                                    <span className="text-sm text-blue-600">#{course.concept}</span>
                                </div>
                                <div className="p-4 space-y-3">
                                    {course.places.map((p) => (
                                        <div key={p.order} className="flex gap-3 items-start">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                {p.imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={p.imageUrl}
                                                        alt={p.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        📍
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-gray-500">{p.order}번</div>
                                                <div className="font-semibold truncate">{p.name}</div>
                                                <div className="text-sm text-gray-500 truncate">{p.address}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
