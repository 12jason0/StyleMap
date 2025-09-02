"use client";

import { useState } from "react";

type NearbyCourse = {
    id: number;
    title: string;
    description?: string;
    imageUrl?: string;
    concept?: string;
    region?: string;
    distance: number; // meters
    start_place_name?: string;
};

export default function NearbyPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [courses, setCourses] = useState<NearbyCourse[]>([]);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [km, setKm] = useState<number>(2);

    const findNearbyCourses = () => {
        setError(null);
        setLoading(true);
        if (!("geolocation" in navigator)) {
            setLoading(false);
            alert("현재 위치를 사용할 수 없어요. 브라우저 설정을 확인해주세요.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    const lat = coords.latitude;
                    const lng = coords.longitude;
                    setCoords({ lat, lng });

                    const res = await fetch(`/api/courses/nearby?lat=${lat}&lng=${lng}&km=${km}`, {
                        cache: "no-store",
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                        throw new Error(data.error || "주변 코스를 가져오는데 실패했습니다.");
                    }
                    // 정규화
                    const list: NearbyCourse[] = (data.courses || []).map((c: any) => ({
                        id: c.id,
                        title: c.title,
                        description: c.description,
                        imageUrl: c.imageUrl,
                        concept: c.concept,
                        region: c.region,
                        distance: Number(c.distance) || 0,
                        start_place_name: c.start_place_name,
                    }));
                    setCourses(list);
                } catch (e) {
                    console.error(e);
                    setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
                    setCourses([]);
                } finally {
                    setLoading(false);
                }
            },
            () => {
                setLoading(false);
                alert("위치 권한을 허용해주세요.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`);

    return (
        <div className="min-h-screen bg-white text-black">
            <section className="max-w-4xl mx-auto px-4 pt-28 pb-12">
                <div className="rounded-3xl p-8 md:p-10 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 text-white shadow-2xl">
                    <div className="mb-4 text-3xl font-bold">📍 실시간 주변 코스 추천</div>
                    <p className="text-white/90 mb-2">현재 위치 기반 · 반경 선택</p>
                    <p className="text-white/80 mb-8">지금 있는 곳에서 가까운 코스를 거리순으로 추천합니다</p>
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* 반경 선택 */}
                        <div className="bg-white/15 rounded-xl p-1 flex gap-1">
                            {[1, 2, 3, 5].map((value) => (
                                <button
                                    key={value}
                                    onClick={() => setKm(value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                                        km === value ? "bg-white text-blue-700" : "text-white hover:bg-white/20"
                                    }`}
                                >
                                    {value}km
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={findNearbyCourses}
                            disabled={loading}
                            className="px-6 py-3 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-60"
                        >
                            {loading ? "검색 중..." : "주변 코스 찾기"}
                        </button>
                    </div>
                </div>

                {/* 결과 */}
                <div className="mt-8">
                    {error && (
                        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-6">{error}</div>
                    )}

                    {!loading && courses.length > 0 && (
                        <div className="space-y-4">
                            <div className="text-gray-700 text-sm">
                                {coords && (
                                    <span>
                                        현재 위치: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                                    </span>
                                )}
                                <span className="ml-2">
                                    / 반경 {km}km 이내 {courses.length}개
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {courses.map((c) => (
                                    <a
                                        key={c.id}
                                        href={`/courses/${c.id}`}
                                        className="group flex gap-4 p-4 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-shadow cursor-pointer"
                                    >
                                        <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                            {c.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={c.imageUrl}
                                                    alt={c.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                                    📦
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-3 mb-1">
                                                <h3 className="font-bold text-gray-900 truncate">{c.title}</h3>
                                                <span className="text-sm text-blue-600 whitespace-nowrap">
                                                    {formatDistance(c.distance)}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 truncate mb-1">
                                                {c.start_place_name || c.region || "시작 장소 정보 없음"}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">{c.concept || "코스"}</div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {!loading && courses.length === 0 && !error && (
                        <div className="mt-6 text-center text-gray-500">
                            검색 결과가 없습니다. 조금 더 넓은 범위를 시도해 보세요.
                        </div>
                    )}
                </div>

                <div className="mt-8 bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <h2 className="text-xl font-bold mb-2 text-gray-900">어떻게 동작하나요?</h2>
                    <p className="text-gray-600">- 현재 위치를 받아 2km 반경 내 코스를 거리순으로 불러옵니다.</p>
                    <p className="text-gray-600">- 코스의 시작 장소를 기준으로 거리를 계산합니다.</p>
                </div>
            </section>
            <div className="md:hidden h-20"></div>
        </div>
    );
}
