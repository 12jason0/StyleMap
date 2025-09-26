"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
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
    const mapRef = useRef<any>(null);

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [showMapSearchButton, setShowMapSearchButton] = useState(false);

    const triggerMapResize = useCallback(() => {
        try {
            if (navermaps && mapRef.current) {
                navermaps.Event.trigger(mapRef.current, "resize");
            } else if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("resize"));
            }
        } catch {}
    }, [navermaps]);

    // --- 데이터 fetching 및 핸들러 ---
    const fetchPlacesAndCourses = useCallback(async (location: { lat: number; lng: number }, keyword?: string) => {
        setLoading(true);
        setError(null);
        setSelectedPlace(null); // 새로운 검색 시 선택된 장소 초기화

        try {
            // 1. 주변 장소 조회 (카카오 장소검색 API 사용)
            let placesUrl = `/api/places/search-kakao?lat=${location.lat}&lng=${location.lng}`;
            if (keyword && keyword.trim()) {
                placesUrl += `&keyword=${encodeURIComponent(keyword)}`;
            }

            const placesRes = await fetch(placesUrl);
            if (!placesRes.ok) {
                throw new Error("장소 정보를 가져오는 데 실패했습니다.");
            }

            const placesData = await placesRes.json();
            const fetchedPlaces = (placesData.success ? placesData.places : []).map((p: any) => ({
                ...p,
                // 백엔드에서 이미 숫자 타입으로 오지만, 안전을 위해 한 번 더 파싱
                latitude: parseFloat(p.latitude),
                longitude: parseFloat(p.longitude),
            }));

            setPlaces(fetchedPlaces);

            // 2. 인근 코스 병행 조회
            const courseRes = await fetch(`/api/courses/nearby?lat=${location.lat}&lng=${location.lng}`);
            if (courseRes.ok) {
                const courseData = await courseRes.json();
                setCourses(courseData.success ? courseData.courses : []);
            } else {
                // 코스 조회 실패는 전체 로직을 중단시키지 않도록 예외 처리
                console.warn("코스 정보를 가져오는 데 실패했습니다.");
                setCourses([]);
            }

            // 키워드 검색이 아닐 때만, 첫 번째 장소로 지도 중심 이동
            if (fetchedPlaces.length > 0 && !keyword) {
                // setCenter({ lat: fetchedPlaces[0].latitude, lng: fetchedPlaces[0].longitude });
            }
        } catch (e: any) {
            setError(e.message || "데이터를 불러오는 데 실패했습니다.");
            setPlaces([]);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    }, []); // 이 함수는 외부 상태에 의존하지 않으므로 의존성 배열은 비어있어도 괜찮습니다.

    const handleSearch = useCallback(async () => {
        // 검색은 현재 지도 중심이 아닌, 검색어 자체의 위치를 기준으로 합니다.
        if (!searchInput.trim()) return;
        setLoading(true);
        setError(null);
        try {
            // '/api/places/search-single'은 단일 장소의 좌표를 얻기 위해 사용
            const res = await fetch(`/api/places/search-single?query=${encodeURIComponent(searchInput)}`);
            const data = await res.json();

            if (data.success && data.place) {
                const foundPlaceLocation = {
                    lat: parseFloat(data.place.lat),
                    lng: parseFloat(data.place.lng),
                };
                // 검색된 장소의 위치를 중심으로 주변 장소와 코스를 다시 불러옵니다.
                setCenter(foundPlaceLocation);
                await fetchPlacesAndCourses(foundPlaceLocation, searchInput);
                setActiveTab("places"); // 검색 후 장소 탭을 활성화
                setSearchInput(""); // 검색 후 입력창 초기화
            } else {
                throw new Error(data.error || "검색 결과가 없습니다.");
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "검색 중 오류 발생");
            setPlaces([]);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    }, [searchInput, fetchPlacesAndCourses]);

    // --- UI 로직 ---
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setLeftPanelOpen(true); // 모바일에서는 기본적으로 패널을 열어둡니다.
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (!mapsReady) return; // 지도 SDK 준비 후 최초 데이터 로드 실행

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = { lat: position.coords.latitude, lng: position.coords.longitude };
                setUserLocation(location);
                setCenter(location);
                fetchPlacesAndCourses(location);
            },
            () => {
                // 위치 정보 권한이 거부되었을 경우 기본 위치(서울)에서 검색
                console.warn("위치 정보 접근이 거부되었습니다. 기본 위치에서 검색합니다.");
                fetchPlacesAndCourses(center);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, [mapsReady, fetchPlacesAndCourses]);

    const handlePlaceClick = (place: Place) => {
        setSelectedPlace(place);
        setCenter({ lat: place.latitude, lng: place.longitude });
        setZoom(17); // 장소 클릭 시 더 확대
        if (isMobile) {
            // 모바일에서는 패널이 이미 열려있으므로 별도 조작 X
        } else {
            setLeftPanelOpen(true); // 데스크탑에서는 패널이 닫혀있을 수 있으므로 열어줌
        }
    };

    const resetPanelState = (closePanel: boolean = false) => {
        setSelectedPlace(null);
        if (isMobile && closePanel) {
            setLeftPanelOpen(false);
        }
    };

    const formatDistance = useCallback(
        (p: Place) => {
            if (!userLocation) return ""; // 사용자 위치가 없으면 거리 계산 불가
            try {
                const R = 6371e3; // meters
                const toRad = (v: number) => (v * Math.PI) / 180;
                const φ1 = toRad(userLocation.lat);
                const φ2 = toRad(p.latitude);
                const Δφ = toRad(p.latitude - userLocation.lat);
                const Δλ = toRad(p.longitude - userLocation.lng);

                const a =
                    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const dist = R * c;

                if (!Number.isFinite(dist)) return "";
                return dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`;
            } catch {
                return "";
            }
        },
        [userLocation]
    );

    const centerLatLng = useMemo(() => {
        if (!navermaps) return null;
        return new navermaps.LatLng(center.lat, center.lng);
    }, [center, navermaps]);

    // 네이버 기본 핀 아이콘 반환 함수
    const getNaverPinIcon = useCallback(
        (type: "user" | "cafe" | "food" | "default") => {
            if (!navermaps) return undefined as any;
            const urlMap: Record<string, string> = {
                user: "https://navermaps.github.io/maps.js/docs/img/example/pin_icon.png",
                cafe: "https://navermaps.github.io/maps.js/docs/img/example/pin_spot.png",
                food: "https://navermaps.github.io/maps.js/docs/img/example/pin_default.png",
                default: "https://navermaps.github.io/maps.js/docs/img/example/pin_default.png",
            };
            const url = urlMap[type] || urlMap.default;
            return {
                url,
                size: new navermaps.Size(24, 37),
                anchor: new navermaps.Point(12, 37),
            } as any;
        },
        [navermaps]
    );

    // /map 페이지에서는 경로를 그리지 않습니다. (코스 상세 페이지에서만 표시)

    // 지도 클릭 시: 선택만 해제하고 패널은 유지
    useEffect(() => {
        if (!navermaps || !mapRef.current) return;
        const map = mapRef.current as any;
        const listener = navermaps.Event.addListener(map, "click", () => {
            setSelectedPlace(null);
        });
        return () => {
            try {
                if (listener) navermaps.Event.removeListener(listener);
            } catch {}
        };
    }, [navermaps, mapRef]);

    if (!mapsReady || !navermaps || !centerLatLng) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoadingSpinner text="지도 초기화 중..." />
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* --- 왼쪽 정보 패널 --- */}
            <div
                className={`z-20 flex flex-col bg-white
                    ${
                        isMobile
                            ? `transition-transform duration-300 fixed inset-x-0 bottom-0 h-[60vh] rounded-t-2xl shadow-2xl ${
                                  leftPanelOpen ? "translate-y-0" : "translate-y-full"
                              }`
                            : `transition-[width] duration-300 h-full border-r border-gray-200 ${
                                  leftPanelOpen ? "w-96" : "w-0 overflow-hidden"
                              }`
                    }`}
                onTransitionEnd={triggerMapResize}
            >
                {/* 검색창 및 헤더 */}
                <div className="flex-shrink-0 sticky top-0 z-10 p-3 md:p-4 bg-white/80 backdrop-blur border-b">
                    <div className="flex gap-2 md:pt-20">
                        <input
                            type="text"
                            placeholder="장소, 음식, 카페 검색"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 placeholder:text-gray-400 bg-white/90"
                        />
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 hover:cursor-pointer shadow-sm"
                            disabled={loading}
                        >
                            검색
                        </button>
                    </div>
                </div>

                {/* 탭 메뉴 */}
                <div className="flex border-b flex-shrink-0 ">
                    <button
                        onClick={() => {
                            setActiveTab("places");
                            setSelectedPlace(null);
                        }}
                        className={`flex-1 p-3 font-semibold hover:cursor-pointer ${
                            activeTab === "places" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
                        }`}
                    >
                        주변 장소 ({selectedPlace ? 1 : places.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("courses")}
                        className={`flex-1 p-3 font-semibold hover:cursor-pointer ${
                            activeTab === "courses" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
                        }`}
                    >
                        추천 코스 ({courses.length})
                    </button>
                </div>

                {/* 콘텐츠 목록 */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <LoadingSpinner />
                    ) : error ? (
                        <div className="text-red-500 p-4 text-center">{error}</div>
                    ) : activeTab === "places" ? (
                        selectedPlace ? (
                            // 장소 상세 정보
                            <div className="p-4">
                                <h3 className="text-xl font-bold text-black">{selectedPlace.name}</h3>
                                <p className="text-gray-600 mt-2">{selectedPlace.address}</p>
                                <p className="text-gray-500 text-sm mt-1">{selectedPlace.category}</p>
                                {selectedPlace.phone && <p className="text-gray-700 mt-2">📞 {selectedPlace.phone}</p>}
                                <div className="mt-4 flex gap-4">
                                    <button
                                        onClick={() =>
                                            window.open(
                                                `https://map.naver.com/v5/search/${encodeURIComponent(
                                                    selectedPlace.name
                                                )}`,
                                                "_blank"
                                            )
                                        }
                                        className="text-black font-semibold hover:underline hover:cursor-pointer"
                                    >
                                        네이버 지도에서 보기
                                    </button>
                                    <button
                                        onClick={() => resetPanelState()}
                                        className="text-gray-500 hover:underline hover:cursor-pointer"
                                    >
                                        목록으로
                                    </button>
                                </div>
                            </div>
                        ) : // 장소 목록
                        (selectedPlace ? [selectedPlace] : places).length > 0 ? (
                            (selectedPlace ? [selectedPlace] : places).map((place) => (
                                <div
                                    key={place.id}
                                    onClick={() => handlePlaceClick(place)}
                                    className="group p-4 mb-2 cursor-pointer bg-white hover:bg-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-semibold text-gray-900 truncate pr-2 text-base md:text-lg">
                                            {place.name}
                                        </h4>
                                        {userLocation && (
                                            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 ring-1 ring-gray-200">
                                                {formatDistance(place)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">{place.address}</p>
                                    <p className="text-xs text-gray-400 truncate">{place.category}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 pt-10">주변 장소가 없습니다.</div>
                        )
                    ) : // 코스 목록
                    courses.length > 0 ? (
                        courses.map((course) => (
                            <div
                                key={course.id}
                                onClick={() => router.push(`/courses/${course.id}`)}
                                className="group p-4 mb-2 cursor-pointer bg-white hover:bg-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
                            >
                                <h4 className="font-semibold text-gray-800">{course.title}</h4>
                                <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 pt-10">주변에 추천 코스가 없습니다.</div>
                    )}
                </div>
            </div>

            {/* --- 네이버 지도 --- */}
            <div className="flex-1 h-full relative">
                <MapDiv style={{ width: "100%", height: "100%" }} id="naver-map-container">
                    <NaverMap
                        ref={mapRef}
                        center={centerLatLng}
                        zoom={zoom}
                        onCenterChanged={(c) => {
                            try {
                                const lat = typeof (c as any).lat === "function" ? (c as any).lat() : (c as any).y;
                                const lng = typeof (c as any).lng === "function" ? (c as any).lng() : (c as any).x;
                                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                                    setCenter({ lat, lng });
                                    setShowMapSearchButton(true);
                                }
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
                                zIndex={300}
                                icon={getNaverPinIcon("user")}
                            />
                        )}
                        {(selectedPlace ? [selectedPlace] : places).map((place) => {
                            const isSel = selectedPlace?.id === place.id;
                            return (
                                <Marker
                                    key={place.id}
                                    position={new navermaps.LatLng(place.latitude, place.longitude)}
                                    title={place.name}
                                    onClick={() => handlePlaceClick(place)}
                                    zIndex={isSel ? 100 : 10}
                                    icon={getNaverPinIcon(
                                        place.category?.includes("카페")
                                            ? "cafe"
                                            : place.category?.includes("음식") || place.category?.includes("맛집")
                                            ? "food"
                                            : "default"
                                    )}
                                />
                            );
                        })}
                    </NaverMap>
                </MapDiv>

                {/* --- 지도 위 UI 컨트롤 --- */}
                {showMapSearchButton && (
                    <div className={`absolute ${isMobile ? "top-20" : "bottom-6"} left-1/2 -translate-x-1/2 z-50`}>
                        <button
                            onClick={async () => {
                                setShowMapSearchButton(false);
                                await fetchPlacesAndCourses(center);
                            }}
                            className="px-5 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-full shadow-xl hover:bg-gray-50 hover:cursor-pointer backdrop-blur"
                        >
                            현재 지도에서 검색
                        </button>
                    </div>
                )}

                <div
                    className={`absolute right-4 ${
                        isMobile ? "top-20" : "bottom-6"
                    } z-10 flex flex-col gap-2 items-end`}
                >
                    {userLocation && (
                        <button
                            onClick={() => {
                                setCenter(userLocation);
                                setZoom(15);
                            }}
                            className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 hover:cursor-pointer"
                            title="내 위치로 이동"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    )}
                    <div className="bg-white rounded-full shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                        <button
                            onClick={() => setZoom((z) => Math.min(21, z + 1))}
                            className="px-3 py-2 hover:bg-gray-100 text-lg font-semibold hover:cursor-pointer text-black"
                            title="확대"
                        >
                            +
                        </button>
                        <span className="block h-px w-full bg-gray-200" />
                        <button
                            onClick={() => setZoom((z) => Math.max(0, z - 1))}
                            className="px-3 py-2 hover:bg-gray-100 text-lg font-semibold hover:cursor-pointer text-black"
                            title="축소"
                        >
                            -
                        </button>
                    </div>
                </div>

                {!isMobile && (
                    <button
                        onClick={() => {
                            setLeftPanelOpen((v) => !v);
                            setTimeout(triggerMapResize, 320);
                        }}
                        className="hover:cursor-pointer fixed top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-r-lg px-2 py-4 shadow-md hover:bg-gray-50 transition-all duration-300 z-20"
                        style={{ left: leftPanelOpen ? "24rem" : "0" }}
                        title={leftPanelOpen ? "패널 닫기" : "패널 열기"}
                    >
                        <span className="text-gray-600 text-sm ">{leftPanelOpen ? "◀" : "▶"}</span>
                    </button>
                )}
            </div>
        </div>
    );
}

// Suspense로 감싸서 useSearchParams 사용에 대한 Next.js 권장사항 준수
export default function MapPage() {
    return (
        <Suspense
            fallback={
                <div className="h-screen flex items-center justify-center">
                    <LoadingSpinner text="페이지 준비 중..." />
                </div>
            }
        >
            <MapPageInner />
        </Suspense>
    );
}
