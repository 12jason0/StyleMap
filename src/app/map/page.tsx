"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Container as MapDiv, NaverMap, Marker } from "react-naver-maps";

// --- 타입 정의 ---
interface Place {
    id: number | string;
    name: string;
    category: string;
    distance?: string;
    address: string;
    description?: string;
    rating?: number;
    phone?: string;
    website?: string;
    imageUrl?: string;
    latitude: number;
    longitude: number;
}

interface Course {
    id: number;
    title: string;
    description: string;
    distance: number;
    start_place_name: string;
}

// --- 로딩 스피너 컴포넌트 ---
const LoadingSpinner = ({ text = "로딩 중..." }: { text?: string }) => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
        <p className="ml-3 text-gray-600">{text}</p>
    </div>
);

// --- 메인 지도 페이지 컴포넌트 ---
function MapPageInner() {
    const router = useRouter();
    const [mapsReady, setMapsReady] = useState(false);
    const navermaps = typeof window !== "undefined" ? (window as any).naver?.maps : null;

    useEffect(() => {
        if (typeof window === "undefined") return;
        if ((window as any).naver?.maps) {
            setMapsReady(true);
            return;
        }
        let attempts = 0;
        const timer = setInterval(() => {
            if ((window as any).naver?.maps) {
                setMapsReady(true);
                clearInterval(timer);
            } else if (++attempts > 100) {
                clearInterval(timer);
            }
        }, 100);
        return () => clearInterval(timer);
    }, []);

    // --- 상태 관리 ---
    const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 37.5665, lng: 126.978 });
    const [zoom, setZoom] = useState(15);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [places, setPlaces] = useState<Place[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [activeTab, setActiveTab] = useState<"places" | "courses">("places");
    // 카테고리 필터 제거
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [showMapSearchButton, setShowMapSearchButton] = useState(false);

    // --- 데이터 fetching 및 핸들러 ---
    const fetchPlacesAndCourses = useCallback(async (location: { lat: number; lng: number }, keyword?: string) => {
        setLoading(true);
        setError(null);
        try {
            let fetchedPlaces: any[] = [];

            if (keyword && keyword.trim()) {
                // 키워드가 있을 때 NAVER만 사용 (DB 폴백 제거)
                const res = await fetch(
                    `/api/places/search-naver?lat=${location.lat}&lng=${location.lng}&keyword=${encodeURIComponent(
                        keyword
                    )}`
                );
                if (res.ok) {
                    const data = await res.json();
                    fetchedPlaces = (data.success ? data.places : []).map((p: any) => ({
                        ...p,
                        latitude: parseFloat(p.latitude),
                        longitude: parseFloat(p.longitude),
                    }));
                } else {
                    fetchedPlaces = [];
                }
            } else {
                // 키워드가 없을 때도 NAVER만 사용 (DB 폴백 제거)
                const naverRes = await fetch(`/api/places/search-naver?lat=${location.lat}&lng=${location.lng}`);
                if (naverRes.ok) {
                    const data = await naverRes.json();
                    fetchedPlaces = (data.success ? data.places : []).map((p: any) => ({
                        ...p,
                        latitude: parseFloat(p.latitude),
                        longitude: parseFloat(p.longitude),
                    }));
                } else {
                    fetchedPlaces = [];
                }
            }

            // 좌표 보강: 서버에서 좌표를 못 받은 항목은 클라이언트 SDK 지오코더로 보강
            const enrichWithClientGeocoder = async (items: any[]): Promise<any[]> => {
                try {
                    const svc = (window as any)?.naver?.maps?.Service;
                    const LatLng = (window as any)?.naver?.maps?.LatLng;
                    if (!svc || !LatLng) return items;
                    const geocodeOnce = (addr: string) =>
                        new Promise<{ lat: number; lng: number } | null>((resolve) => {
                            try {
                                svc.geocode({ query: addr }, (status: any, resp: any) => {
                                    try {
                                        if (status === (window as any).naver.maps.Service.Status.OK) {
                                            const r = Array.isArray(resp?.v2?.addresses) ? resp.v2.addresses[0] : null;
                                            if (r && r.y && r.x)
                                                return resolve({ lat: parseFloat(r.y), lng: parseFloat(r.x) });
                                        }
                                    } catch {}
                                    resolve(null);
                                });
                            } catch {
                                resolve(null);
                            }
                        });
                    const out: any[] = [];
                    for (const it of items) {
                        if (Number.isFinite(parseFloat(it?.latitude)) && Number.isFinite(parseFloat(it?.longitude))) {
                            out.push(it);
                            continue;
                        }
                        const addr = it?.address || it?.description || "";
                        if (!addr) continue;
                        const c = await geocodeOnce(addr);
                        if (c) out.push({ ...it, latitude: c.lat, longitude: c.lng });
                    }
                    return out.length ? out : items;
                } catch {
                    return items;
                }
            };

            fetchedPlaces = await enrichWithClientGeocoder(fetchedPlaces);
            setPlaces(fetchedPlaces);

            // 인근 코스 병행 조회
            const courseRes = await fetch(`/api/courses/nearby?lat=${location.lat}&lng=${location.lng}`);
            const courseData = await courseRes.json();
            setCourses(courseData.success ? courseData.courses : []);

            if (fetchedPlaces.length > 0 && !keyword) {
                setCenter({ lat: fetchedPlaces[0].latitude, lng: fetchedPlaces[0].longitude });
            }
        } catch (e) {
            setError("데이터를 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSearch = useCallback(async () => {
        if (!searchInput.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/places/search-single?query=${encodeURIComponent(searchInput)}`);
            const data = await res.json();
            if (data.success) {
                const foundPlace = {
                    ...data.place,
                    latitude: parseFloat(data.place.lat),
                    longitude: parseFloat(data.place.lng),
                };
                setPlaces([foundPlace]);
                setSelectedPlace(foundPlace);
                setCenter({ lat: foundPlace.latitude, lng: foundPlace.longitude });
                await fetchPlacesAndCourses({ lat: foundPlace.latitude, lng: foundPlace.longitude });
                setActiveTab("courses");
            } else {
                throw new Error(data.error || "검색 결과가 없습니다.");
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "검색 중 오류 발생");
        } finally {
            setLoading(false);
        }
    }, [searchInput, fetchPlacesAndCourses]);

    // --- UI 로직 ---
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setLeftPanelOpen(false);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = { lat: position.coords.latitude, lng: position.coords.longitude };
                setUserLocation(location);
                setCenter(location);
                fetchPlacesAndCourses(location);
            },
            () => {
                fetchPlacesAndCourses(center);
            }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePlaceClick = (place: Place) => {
        setSelectedPlace(place);
        setCenter({ lat: place.latitude, lng: place.longitude });
        setZoom(16);
        if (isMobile) setLeftPanelOpen(true);
    };

    // --- 카테고리 필터 유틸 ---
    const filteredPlaces = places;

    const resetPanelState = (closePanel: boolean = false) => {
        setSelectedPlace(null);
        if (isMobile && closePanel) {
            setLeftPanelOpen(false);
        }
    };

    // --- 거리 표시 유틸 (UI 개선) ---
    const formatDistance = useCallback(
        (p: Place) => {
            try {
                const R = 6371000;
                const toRad = (v: number) => (v * Math.PI) / 180;
                const dLat = toRad(p.latitude - center.lat);
                const dLng = toRad(p.longitude - center.lng);
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(toRad(center.lat)) *
                        Math.cos(toRad(p.latitude)) *
                        (Math.sin(dLng / 2) * Math.sin(dLng / 2));
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const dist = R * c; // meters
                if (!Number.isFinite(dist)) return "";
                return dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`;
            } catch {
                return "";
            }
        },
        [center]
    );

    // 훅은 항상 실행 (조건부 금지), 준비 전에는 null 반환
    const centerLatLng = useMemo(() => {
        if (!navermaps) return null;
        return new navermaps.LatLng(center.lat, center.lng);
    }, [center, navermaps]);

    if (!mapsReady || !navermaps || !centerLatLng) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoadingSpinner text="지도 초기화 중..." />
            </div>
        );
    }

    return (
        <div className="flex h-screen">
            <div
                className={`z-20 ${
                    isMobile
                        ? `transition-transform duration-300 fixed inset-x-0 bottom-0 h-[60vh] bg-white rounded-t-2xl shadow-2xl flex flex-col ${
                              leftPanelOpen ? "translate-y-0" : "translate-y-full"
                          }`
                        : `transition-[width] duration-300 h-full bg-white border-r border-gray-200 flex flex-col ${
                              leftPanelOpen ? "w-96 pointer-events-auto" : "w-0 overflow-hidden pointer-events-none"
                          }`
                }`}
                aria-hidden={!leftPanelOpen && !isMobile}
            >
                <div className="flex-shrink-0 p-4 border-b pt-20">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="장소, 음식, 카페 검색"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="flex-1 px-4 py-2 border rounded-lg"
                        />
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            검색
                        </button>
                    </div>
                    {/* 카테고리 필터 제거 */}
                </div>
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab("places")}
                        className={`flex-1 p-3 ${
                            activeTab === "places" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
                        }`}
                    >
                        주변 장소 ({places.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("courses")}
                        className={`flex-1 p-3 ${
                            activeTab === "courses" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
                        }`}
                    >
                        추천 코스 ({courses.length})
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <LoadingSpinner />
                    ) : error ? (
                        <div className="text-red-500 p-4">{error}</div>
                    ) : activeTab === "places" ? (
                        selectedPlace ? (
                            <div className="p-2">
                                <h3 className="text-xl font-bold">{selectedPlace.name}</h3>
                                <p className="text-gray-600 mt-1">{selectedPlace.address}</p>
                                <button
                                    onClick={() =>
                                        window.open(
                                            `https://map.naver.com/v5/search/${encodeURIComponent(selectedPlace.name)}`,
                                            "_blank"
                                        )
                                    }
                                    className="mt-4 text-blue-600 font-semibold"
                                >
                                    네이버 지도에서 보기
                                </button>
                                <button onClick={() => resetPanelState()} className="mt-4 ml-4 text-gray-500">
                                    목록으로 돌아가기
                                </button>
                            </div>
                        ) : (
                            filteredPlaces.map((place) => (
                                <div
                                    key={place.id}
                                    onClick={() => handlePlaceClick(place)}
                                    className="group p-3 cursor-pointer hover:bg-gray-100 rounded-lg border-b last:border-b-0"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-semibold text-gray-900 line-clamp-1">{place.name}</h4>
                                        <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {formatDistance(place)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-1">{place.address}</p>
                                </div>
                            ))
                        )
                    ) : (
                        courses.map((course) => (
                            <div
                                key={course.id}
                                onClick={() => router.push(`/courses/${course.id}`)}
                                className="p-3 cursor-pointer hover:bg-gray-100 rounded-lg"
                            >
                                <h4 className="font-semibold">{course.title}</h4>
                                <p className="text-sm text-gray-500 line-clamp-2">{course.description}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="flex-1 h-full">
                <MapDiv style={{ width: "100%", height: "100%" }} id="naver-map-container">
                    <NaverMap
                        center={centerLatLng}
                        zoom={zoom}
                        onCenterChanged={(c) => {
                            try {
                                const lat = typeof (c as any).lat === "function" ? (c as any).lat() : (c as any).y;
                                const lng = typeof (c as any).lng === "function" ? (c as any).lng() : (c as any).x;
                                if (Number.isFinite(lat) && Number.isFinite(lng)) setCenter({ lat, lng });
                                setShowMapSearchButton(true);
                            } catch {}
                        }}
                        onZoomChanged={(z) => {
                            if (Number.isFinite(z as number)) setZoom(z as number);
                            setShowMapSearchButton(true);
                        }}
                    >
                        {userLocation && (
                            <Marker
                                position={new navermaps.LatLng(userLocation.lat, userLocation.lng)}
                                title="현재 위치"
                            />
                        )}
                        {places.map((place) => {
                            const pos = new navermaps.LatLng(place.latitude, place.longitude);
                            const isSel = selectedPlace?.id === place.id;
                            return (
                                <Marker
                                    key={place.id}
                                    position={pos}
                                    title={place.name}
                                    onClick={() => handlePlaceClick(place)}
                                    zIndex={isSel ? 100 : 10}
                                />
                            );
                        })}
                    </NaverMap>
                </MapDiv>
            </div>

            <div className="fixed right-6 bottom-6 z-10">
                <div className="flex flex-col gap-2 items-end">
                    {userLocation && (
                        <button
                            onClick={() => setCenter(userLocation)}
                            className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-100"
                            title="내 위치로 이동"
                        >
                            📍
                        </button>
                    )}
                    <div className="bg-white rounded-full shadow-lg border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => setZoom((z) => z + 1)}
                            className="px-3 py-2 hover:bg-gray-100 hover:cursor-pointer color-black"
                            title="확대"
                        >
                            +
                        </button>
                        <span className="inline-block w-px h-5 align-middle bg-gray-200" />
                        <button
                            onClick={() => setZoom((z) => z - 1)}
                            className="px-3 py-2 hover:bg-gray-100 hover:cursor-pointer color-black"
                            title="축소"
                        >
                            -
                        </button>
                    </div>
                </div>

                {/* 좌측 패널 열기/닫기 토글 (데스크톱 전용) */}
                {!isMobile && (
                    <button
                        onClick={() => setLeftPanelOpen((v) => !v)}
                        className="fixed top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-r-lg px-2 py-4 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out z-20 hover:bg-gray-50 hover:cursor-pointer"
                        style={{ left: leftPanelOpen ? "24rem" : "0" }}
                        aria-label={leftPanelOpen ? "패널 닫기" : "패널 열기"}
                        title={leftPanelOpen ? "패널 닫기" : "패널 열기"}
                    >
                        <span className="text-gray-600 text-sm">{leftPanelOpen ? "◀" : "▶"}</span>
                    </button>
                )}
            </div>

            {showMapSearchButton && (
                <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-10">
                    <button
                        onClick={async () => {
                            setShowMapSearchButton(false);
                            await fetchPlacesAndCourses(center);
                        }}
                        className="px-4 py-2 bg-white text-black border border-gray-300 rounded-full shadow hover:bg-gray-50 hover:cursor-pointer"
                    >
                        현재 지도에서 검색
                    </button>
                </div>
            )}
        </div>
    );
}

export default function MapPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center">페이지 로딩 중...</div>}>
            <MapPageInner />
        </Suspense>
    );
}
