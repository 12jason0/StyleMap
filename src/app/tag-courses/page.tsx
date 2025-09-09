"use client";

import { useEffect, useState } from "react";
import KakaoMap from "@/components/KakaoMap";

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
    const [resultPlaces, setResultPlaces] = useState<TagCoursePlace[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [arrangedPlaces, setArrangedPlaces] = useState<TagCoursePlace[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewPlaces, setPreviewPlaces] = useState<TagCoursePlace[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<{
        id: number;
        name: string;
        latitude: number;
        longitude: number;
        address?: string;
        imageUrl?: string;
        description?: string;
    } | null>(null);

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

    // 장소를 가까운 순으로 묶고 [음식점→카페→음식점…]로 정렬
    const arrangePlacesByProximityAndPattern = (places: TagCoursePlace[]): TagCoursePlace[] => {
        if (!places || places.length === 0) return [];
        const textOf = (p: TagCoursePlace) => `${p.category || ""} ${p.name || ""}`;
        const isCafe = (p: TagCoursePlace) => /카페|coffee/i.test(textOf(p));
        const isRestaurant = (p: TagCoursePlace) =>
            /(음식|맛집|식당|중국요리|해물|해산물|생선|수산|횟집|국밥|칼국수|분식|김밥|비빔|백반|고기|돼지|소고기|치킨|탕|국|면|냉면|만두)/i.test(
                textOf(p)
            );

        const cafes = places.filter(isCafe);
        const restaurants = places.filter((p) => !isCafe(p) && isRestaurant(p));
        const others = places.filter((p) => !isCafe(p) && !isRestaurant(p));

        const centerLat = places.reduce((s, p) => s + p.latitude, 0) / places.length;
        const centerLng = places.reduce((s, p) => s + p.longitude, 0) / places.length;
        const dist2 = (a: TagCoursePlace, b: TagCoursePlace) => {
            const dx = a.latitude - b.latitude;
            const dy = a.longitude - b.longitude;
            return dx * dx + dy * dy;
        };
        const dist2FromCenter = (p: TagCoursePlace) => {
            const dx = p.latitude - centerLat;
            const dy = p.longitude - centerLng;
            return dx * dx + dy * dy;
        };

        const pickNearest = (from: TagCoursePlace, pool: TagCoursePlace[], used: Set<number>) => {
            let best: TagCoursePlace | null = null;
            let bd = Infinity;
            for (const p of pool) {
                if (used.has(p.id)) continue;
                const d = dist2(from, p);
                if (d < bd) {
                    bd = d;
                    best = p;
                }
            }
            return best;
        };

        const sortedByCenter = [...places].sort((a, b) => dist2FromCenter(a) - dist2FromCenter(b));
        const start =
            sortedByCenter.find((p) => restaurants.includes(p)) ||
            sortedByCenter.find((p) => cafes.includes(p)) ||
            sortedByCenter[0];

        const used = new Set<number>();
        const result: TagCoursePlace[] = [];
        if (start) {
            result.push(start);
            used.add(start.id);
        }

        let wantCafeNext = restaurants.includes(start!);
        while (result.length < places.length) {
            const pool = wantCafeNext ? cafes : restaurants;
            const next = pickNearest(result[result.length - 1], pool, used);
            if (!next) break;
            result.push(next);
            used.add(next.id);
            wantCafeNext = !wantCafeNext;
        }

        const appendRemaining = (pool: TagCoursePlace[]) => {
            const remain = pool
                .filter((p) => !used.has(p.id))
                .sort((a, b) => dist2(result[result.length - 1], a) - dist2(result[result.length - 1], b));
            for (const p of remain) {
                result.push(p);
                used.add(p.id);
            }
        };
        appendRemaining(wantCafeNext ? restaurants : cafes);
        appendRemaining(wantCafeNext ? cafes : restaurants);
        appendRemaining(others);

        return result;
    };

    useEffect(() => {
        if (resultPlaces.length > 0) {
            setArrangedPlaces(arrangePlacesByProximityAndPattern(resultPlaces));
        } else {
            setArrangedPlaces([]);
        }
    }, [resultPlaces]);
    const generateCourses = async () => {
        if (selectedTags.length === 0) {
            setNotice("태그를 선택해 주세요 (최대 3개)");
            return;
        }
        setCourses([]);
        setResultPlaces([]);
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
            const merged = results.flat();
            const placeSeen = new Set<number>();
            const places: TagCoursePlace[] = [];
            for (const c of merged) {
                for (const p of c.places) {
                    if (placeSeen.has(p.id)) continue;
                    placeSeen.add(p.id);
                    places.push(p);
                }
            }
            setResultPlaces(places);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-black pt-24 px-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">여행 맞춤 제작소</h1>
                <p className="text-gray-600 mb-6">
                    지역 · 컨셉(태그) · 그 외로 나눠 선택하세요. 선택한 지역 중심으로 코스를 생성합니다.
                </p>

                {/* 지역 선택 */}
                <div className="mb-6">
                    <h2 className="font-semibold mb-2">지역</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 ">
                        {regions.slice(0, 18).map((r) => (
                            <button
                                key={r}
                                onClick={() => setSelectedRegion(r === selectedRegion ? "" : r)}
                                className={`px-3 py-2 rounded-lg border text-sm transition-colors hover:cursor-pointer ${
                                    selectedRegion === r
                                        ? "border-green-500 text-green-600 bg-green-50"
                                        : "border-gray-200 hover:bg-green-50"
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    {regions.length > 18 && <div className="text-xs text-gray-500 mt-1 ">상위 18개 지역만 표시 중</div>}
                </div>

                {/* 컨셉(태그) */}
                <h2 className="font-semibold mb-2">컨셉</h2>
                {notice === "limit" && (
                    <div className="mb-3 p-3 rounded-lg bg-yellow-50 text-yellow-800 text-sm border border-yellow-200">
                        태그는 최대 3개까지 선택 가능합니다.
                    </div>
                )}
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
                                            setNotice("limit");
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
                    {notice && notice !== "limit" && <div className="text-sm text-red-500">{notice}</div>}
                </div>

                {(selectedRegion || selectedTags.length > 0) && (
                    <div className="mb-6 flex flex-wrap gap-2">
                        {selectedRegion && (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-sm border border-green-200">
                                지역: {selectedRegion}
                                <button
                                    onClick={() => setSelectedRegion("")}
                                    className="hover:text-green-900"
                                    aria-label="지역 제거"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {selectedTags.map((t) => (
                            <span
                                key={`chip-${t}`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm border border-blue-200"
                            >
                                {t}
                                <button
                                    onClick={() => setSelectedTags((prev) => prev.filter((x) => x !== t))}
                                    className="hover:text-blue-900"
                                    aria-label={`${t} 제거`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        <button
                            onClick={() => {
                                setSelectedRegion("");
                                setSelectedTags([]);
                            }}
                            className="hover:cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm border border-gray-200 hover:bg-gray-200"
                        >
                            초기화
                        </button>
                    </div>
                )}

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
                                setResultPlaces([]);
                            }}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:cursor-pointer"
                        >
                            선택 초기화
                        </button>
                    )}
                </div>

                {/* 결과 섹션 */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm animate-pulse"
                            >
                                <div className="p-4 border-b h-12 bg-gray-100" />
                                <div className="p-4 space-y-3">
                                    {[0, 1, 2, 3].map((j) => (
                                        <div key={j} className="flex gap-3 items-center">
                                            <div className="w-6 h-6 rounded-full bg-gray-200" />
                                            <div className="w-12 h-12 rounded-lg bg-gray-200" />
                                            <div className="flex-1">
                                                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                                                <div className="h-3 bg-gray-200 rounded w-2/3" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {error && <div className="p-6 text-red-600">{error}</div>}

                {!loading && !error && (arrangedPlaces.length > 0 || resultPlaces.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(() => {
                            const base = arrangedPlaces.length > 0 ? arrangedPlaces : resultPlaces;
                            const groups: TagCoursePlace[][] = [];
                            for (let i = 0; i < base.length; i += 4) {
                                groups.push(base.slice(i, i + 4));
                            }
                            return groups.map((grp, gi) => (
                                <div
                                    key={`grp-${gi}`}
                                    className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-20 hover:cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => {
                                        setPreviewPlaces(grp.map((p, idx) => ({ ...p, order: idx + 1 })));
                                        setSelectedPlace(null);
                                        setPreviewOpen(true);
                                    }}
                                >
                                    <div className="p-4 border-b flex items-center justify-between">
                                        <h3 className="font-bold text-lg">{`${
                                            selectedRegion || selectedTags[0] || "추천"
                                        } 코스 #${gi + 1}`}</h3>
                                        <span className="text-sm text-blue-600">
                                            #{selectedTags.join("/") || selectedRegion || "mixed"}
                                        </span>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {grp.map((p, idx) => (
                                            <div key={`${gi}-${p.id}`} className="flex gap-3 items-center">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                                    {idx + 1}
                                                </div>
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    {p.imageUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={encodeURI(p.imageUrl.trim())}
                                                            alt={p.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.currentTarget as HTMLImageElement;
                                                                target.onerror = null;
                                                                target.src = "/images/placeholder-location.jpg";
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            📍
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold truncate">{p.name}</div>
                                                    <div className="text-sm text-gray-500 truncate">{p.address}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}

                {!loading && !error && arrangedPlaces.length === 0 && resultPlaces.length === 0 && (
                    <div className="p-8 text-center text-gray-600 border border-gray-200 rounded-2xl">
                        현재 선택 조건에 맞는 코스가 없습니다.
                        <div className="text-sm text-gray-500 mt-2">빠른 시일 내에 정보를 추가하겠습니다.</div>
                    </div>
                )}

                {previewOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setPreviewOpen(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4">
                            <div className="flex items-center justify-between p-3 border-b">
                                <h3 className="font-bold text-base">코스 미리보기</h3>
                                <button
                                    className="text-gray-500 hover:text-gray-700"
                                    onClick={() => setPreviewOpen(false)}
                                >
                                    ×
                                </button>
                            </div>
                            <div className="p-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
                                <div className="lg:col-span-2">
                                    <KakaoMap
                                        places={
                                            previewPlaces.map((p) => ({
                                                id: p.id,
                                                name: p.name,
                                                latitude: p.latitude,
                                                longitude: p.longitude,
                                                address: p.address || "",
                                                imageUrl: p.imageUrl || "",
                                                description: p.name,
                                            })) as any
                                        }
                                        userLocation={null as any}
                                        selectedPlace={selectedPlace as any}
                                        onPlaceClick={(place: any) => setSelectedPlace(place as any)}
                                        draggable={false}
                                        drawPath={true}
                                        routeMode="foot"
                                        className="w-full h-80 md:h-96 rounded-xl"
                                    />
                                </div>
                                <div className="lg:col-span-1 space-y-2 max-h-[24rem] overflow-y-auto">
                                    {previewPlaces.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex gap-2 items-center border rounded-xl p-2 hover:cursor-pointer"
                                            onClick={() =>
                                                setSelectedPlace({
                                                    id: p.id,
                                                    name: p.name,
                                                    latitude: p.latitude,
                                                    longitude: p.longitude,
                                                    address: p.address || "",
                                                    imageUrl: p.imageUrl || "",
                                                    description: p.name,
                                                } as any)
                                            }
                                        >
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                                                {p.order}
                                            </div>
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
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
                                                <div className="font-semibold text-sm truncate">{p.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{p.address}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-3 border-t flex justify-end">
                                <button
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 hover:cursor-pointer"
                                    onClick={() => setPreviewOpen(false)}
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
