"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

// --- 인터페이스 및 컴포넌트 정의 ---
interface Place {
    id: number;
    name: string;
    category: string;
    distance: string;
    address: string;
    description: string;
    rating: number;
    phone?: string;
    website?: string;
    imageUrl: string;
    latitude: number;
    longitude: number;
}

interface UserLocation {
    lat: number;
    lng: number;
}

declare global {
    interface Window {
        kakao: any;
    }
}

const LoadingSpinner = ({ text = "로딩 중..." }: { text?: string }) => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
        <p className="mt-2 ml-3 text-gray-600">{text}</p>
    </div>
);

// --- 메인 페이지 컴포넌트 ---
export default function MapPage() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams?.get("search");

    // --- 상태 관리 ---
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [searchInput, setSearchInput] = useState(searchQuery || "");
    const [activeTab, setActiveTab] = useState<"places" | "courses">("places");
    const [showMapSearchButton, setShowMapSearchButton] = useState(false);
    const [isSearchingMapArea, setIsSearchingMapArea] = useState(false);
    const [searchedPlace, setSearchedPlace] = useState<Place | null>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    // --- 지도 관련 ref ---
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    // --- 유틸 함수들 ---
    const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
        setToast({ message, type });
    }, []);

    // --- 데이터 로딩 및 검색 로직 (카카오 API 사용) ---
    const searchNearbyPlaces = useCallback(async (location: UserLocation, keyword?: string) => {
        setLoading(true);
        setError(null);
        try {
            const keywords = keyword ? [keyword] : ["음식점", "카페", "관광명소"];
            const searchPromises = keywords.map((searchKeyword) =>
                fetch(`/api/places/search?lat=${location.lat}&lng=${location.lng}&keyword=${searchKeyword}`).then(
                    (res) => res.json()
                )
            );

            const results = await Promise.all(searchPromises);

            const newPlaces = results.flatMap((result) => result.places || []);
            // 중복 제거
            const uniquePlaces = Array.from(new Map(newPlaces.map((p) => [p.id, p])).values());

            setPlaces(uniquePlaces);
        } catch (e) {
            setError("주변 장소를 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    }, []);

    // --- 지도 초기화 및 마커 로직 ---
    useEffect(() => {
        // window.kakao 객체가 로드되었는지, 지도 DOM이 있는지 확인
        if (window.kakao && mapRef.current) {
            // kakao.maps.load()를 통해 API가 완전히 준비되도록 보장
            window.kakao.maps.load(() => {
                // 지도의 중심 좌표 설정
                const centerPosition = userLocation
                    ? new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng)
                    : new window.kakao.maps.LatLng(37.5665, 126.978);

                const mapOptions = {
                    center: centerPosition,
                    level: 5,
                };

                // 맵 인스턴스 생성 또는 업데이트
                mapInstance.current = new window.kakao.maps.Map(mapRef.current, mapOptions);

                // 지도 움직임 감지 이벤트 추가
                window.kakao.maps.event.addListener(mapInstance.current, "dragend", () => {
                    setShowMapSearchButton(true);
                });
                window.kakao.maps.event.addListener(mapInstance.current, "zoom_changed", () => {
                    setShowMapSearchButton(true);
                });

                // 지도 클릭 시 정보창 닫기
                window.kakao.maps.event.addListener(mapInstance.current, "click", () => {
                    markersRef.current.forEach((m) => m.infoWindow?.close());
                    setSelectedPlace(null);
                });
            });
        }
    }, [userLocation]); // userLocation이 확정되면 지도를 초기화

    // 마커 업데이트 Hook
    useEffect(() => {
        if (!mapInstance.current || !window.kakao) return;

        const map = mapInstance.current;
        const kakao = window.kakao;
        const markers: any[] = [];

        const bounds = new kakao.maps.LatLngBounds();

        // 장소 마커 생성
        places.forEach((place) => {
            const isSelected = selectedPlace?.id === place.id;
            const position = new kakao.maps.LatLng(place.latitude, place.longitude);
            // 기본 커스텀 마커 생성
            const marker = new kakao.maps.Marker({
                position,
                title: place.name,
            });
            marker.setMap(map);

            // 마커 클릭 이벤트 (지도 위 정보창 없이 왼쪽 패널에만 표시)
            kakao.maps.event.addListener(marker, "click", () => {
                console.log("핀 클릭됨:", place.name);
                // 왼쪽 패널에만 선택된 장소 표시 (지도 위 정보창 없음)
                setSelectedPlace(place);
                console.log("selectedPlace 설정됨:", place.name);

                // 검색된 장소가 아닌 주변 핀 클릭 시 해당 위치에서 새로운 검색 수행
                if (searchedPlace && place.id !== searchedPlace.id) {
                    // 검색된 장소의 포커스 제거
                    setSearchedPlace(null);

                    // 클릭한 핀 주변의 관광명소, 음식점, 카페 검색
                    searchNearbyPlaces({ lat: place.latitude, lng: place.longitude }, "음식점,카페,관광명소");
                }
            });

            markersRef.current.push({ marker, infoWindow: null, placeId: place.id });
            bounds.extend(position);
        });

        // 클린업 함수: 이 효과가 다시 실행되기 전에 기존 마커들을 지움
        return () => {
            markers.forEach((marker) => marker.setMap(null));
        };
    }, [places, selectedPlace]);

    // --- 초기 데이터 로드 ---
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = { lat: position.coords.latitude, lng: position.coords.longitude };
                setUserLocation(location);
                searchNearbyPlaces(location);
            },
            () => {
                const defaultLocation = { lat: 37.5665, lng: 126.978 };
                setUserLocation(defaultLocation);
                searchNearbyPlaces(defaultLocation);
            }
        );
    }, [searchNearbyPlaces]);

    // --- 핸들러 함수들 ---
    const handleSearch = useCallback(async () => {
        const searchTerm = searchInput.trim();
        if (!searchTerm) return;

        setLoading(true);
        setError(null);
        setPlaces([]); // 이전 장소 목록 초기화
        setCourses([]); // 이전 코스 목록 초기화
        setSearchedPlace(null);

        try {
            // 1. 카카오 API로 장소 좌표 검색
            const placeRes = await fetch(`/api/places/search-single?query=${encodeURIComponent(searchTerm)}`);
            const placeResult = await placeRes.json();

            if (!placeResult.success) {
                throw new Error(placeResult.error || "검색된 장소가 없습니다.");
            }

            const foundPlace = placeResult.place;
            // Place 인터페이스에 맞게 임시 데이터 추가
            const mainPlace: Place = {
                id: foundPlace.id,
                name: foundPlace.name,
                address: foundPlace.address,
                latitude: foundPlace.lat,
                longitude: foundPlace.lng,
                category: "검색결과",
                distance: "0m",
                description: foundPlace.address,
                rating: 5.0,
                imageUrl: "/images/placeholder-location.jpg",
            };

            setSearchedPlace(mainPlace); // 검색된 장소 상태에 저장
            setPlaces([mainPlace]); // 지도에 표시하기 위해 places 배열에 추가
            setSelectedPlace(mainPlace); // 해당 장소를 선택된 것으로 표시

            // 검색된 장소로 지도 이동
            if (mapInstance.current) {
                mapInstance.current.panTo(new window.kakao.maps.LatLng(foundPlace.lat, foundPlace.lng));
            }

            // 2. 찾은 장소의 좌표로 주변 코스 검색
            const courseRes = await fetch(`/api/courses/nearby?lat=${foundPlace.lat}&lng=${foundPlace.lng}`);
            const courseResult = await courseRes.json();

            if (courseResult.success) {
                setCourses(courseResult.courses);
                setActiveTab("courses"); // 추천 코스 탭으로 전환
            }

            // 검색창 초기화
            setSearchInput("");
        } catch (e) {
            setError(e instanceof Error ? e.message : "검색 중 오류가 발생했습니다.");
            setPlaces([]);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    }, [searchInput]);

    const moveToMyLocation = useCallback(() => {
        if (mapInstance.current && userLocation) {
            mapInstance.current.panTo(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng));
            showToast("내 위치로 이동했습니다.", "info");
        }
    }, [userLocation, showToast]);

    const handleZoomIn = useCallback(() => {
        if (mapInstance.current) {
            const level = mapInstance.current.getLevel();
            mapInstance.current.setLevel(level - 1);
        }
    }, []);

    const handleZoomOut = useCallback(() => {
        if (mapInstance.current) {
            const level = mapInstance.current.getLevel();
            mapInstance.current.setLevel(level + 1);
        }
    }, []);

    const handlePlaceClick = useCallback((place: Place) => {
        setSelectedPlace(place);
        if (mapInstance.current) {
            mapInstance.current.panTo(new window.kakao.maps.LatLng(place.latitude, place.longitude));
        }
    }, []);

    // --- 렌더링 ---
    return (
        <>
            {toast && (
                <div
                    className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-[9999] ${
                        toast.type === "success"
                            ? "bg-green-500"
                            : toast.type === "error"
                            ? "bg-red-500"
                            : "bg-blue-500"
                    } text-white`}
                >
                    <div className="flex items-center gap-2">
                        <span>{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2 text-white hover:text-gray-200">
                            ×
                        </button>
                    </div>
                </div>
            )}

            <div className="h-screen bg-white flex flex-col pt-18 text-black">
                <div className="flex-1 flex relative min-h-0">
                    {/* 왼쪽 패널 */}
                    <div
                        className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
                            leftPanelOpen ? "w-96" : "w-0"
                        } overflow-hidden z-20 flex-shrink-0`}
                    >
                        <div className="w-96 h-full flex flex-col">
                            {/* 검색바 */}
                            <div className="p-4 border-b border-gray-200 bg-gray-50">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="장소, 음식, 카페 검색"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                                        className="w-full px-4 py-3 pl-10 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-500"
                                    />
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        🔍
                                    </div>
                                    <button
                                        onClick={handleSearch}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                                    >
                                        검색
                                    </button>
                                </div>
                            </div>

                            {/* 탭 */}
                            <div className="flex border-b border-gray-200 bg-white">
                                <button
                                    onClick={() => setActiveTab("places")}
                                    className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                                        activeTab === "places"
                                            ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                                            : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                    }`}
                                >
                                    주변 장소 ({places.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab("courses")}
                                    className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                                        activeTab === "courses"
                                            ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                                            : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                    }`}
                                >
                                    추천 코스 ({courses.length})
                                </button>
                            </div>

                            {/* 컨텐츠 */}
                            <div className="flex-1 overflow-y-auto bg-gray-50">
                                {/* 검색 결과가 있을 때 특별 헤더 표시 */}
                                {searchedPlace && (
                                    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg m-4">
                                        <p className="text-sm text-gray-600">
                                            '<span className="font-bold text-blue-600">{searchedPlace.name}</span>'
                                            주변의 추천 코스입니다.
                                        </p>
                                    </div>
                                )}

                                {loading ? (
                                    <LoadingSpinner text="주변 장소를 찾고 있어요..." />
                                ) : error ? (
                                    <div className="text-center text-red-500 p-8">{error}</div>
                                ) : activeTab === "places" ? (
                                    <div className="p-4 space-y-4">
                                        {selectedPlace ? (
                                            // 선택된 장소 정보 표시
                                            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-md">
                                                <div className="flex items-start justify-between mb-4">
                                                    <h3 className="text-xl font-bold text-gray-900">
                                                        {selectedPlace.name}
                                                    </h3>
                                                    <button
                                                        onClick={() => setSelectedPlace(null)}
                                                        className="text-gray-400 hover:text-gray-600 text-xl"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                                            {selectedPlace.category}
                                                        </span>
                                                        <span className="text-gray-600">
                                                            📍 {selectedPlace.distance}
                                                        </span>
                                                        <span>⭐ {selectedPlace.rating}</span>
                                                    </div>
                                                    <div className="text-gray-700">
                                                        <p className="font-medium mb-1">주소</p>
                                                        <p className="text-sm">{selectedPlace.address}</p>
                                                    </div>
                                                    {selectedPlace.description && (
                                                        <div className="text-gray-700">
                                                            <p className="font-medium mb-1">설명</p>
                                                            <p className="text-sm">{selectedPlace.description}</p>
                                                        </div>
                                                    )}
                                                    <div className="flex gap-2 pt-2">
                                                        <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                                            길찾기
                                                        </button>
                                                        {selectedPlace.phone && (
                                                            <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                                                                전화
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            // 주변 장소 목록 표시
                                            <div className="space-y-3">
                                                {places.map((place) => (
                                                    <div
                                                        key={place.id}
                                                        onClick={() => handlePlaceClick(place)}
                                                        className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                                                    >
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                                                                {place.name}
                                                            </h4>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                                                    {place.category}
                                                                </span>
                                                                <span>📍 {place.distance}</span>
                                                                <span>⭐ {place.rating}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-500 line-clamp-2">
                                                                {place.address}
                                                            </p>
                                                            <div className="flex gap-2 mt-3">
                                                                <button className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">
                                                                    길찾기
                                                                </button>
                                                                {place.phone && (
                                                                    <button className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">
                                                                        전화
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === "courses" ? (
                                    <div className="p-4 space-y-4">
                                        {/* 코스 목록 */}
                                        <div className="space-y-3">
                                            {courses.length > 0 ? (
                                                courses.map((course) => (
                                                    <div
                                                        key={course.id}
                                                        className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                                                    >
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                                                                {course.title}
                                                            </h4>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                                                    코스
                                                                </span>
                                                                <span>📍 {Math.round(course.distance)}m</span>
                                                                <span>🚶‍♂️ {course.start_place_name}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-500 line-clamp-2">
                                                                {course.description || "멋진 코스입니다!"}
                                                            </p>
                                                            <div className="flex gap-2 mt-3">
                                                                <button className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition-colors text-blue-700">
                                                                    코스 보기
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center p-8 text-gray-500">
                                                    <div className="text-4xl mb-4">🎯</div>
                                                    <p className="text-lg mb-2">주변에 추천 코스가 없습니다</p>
                                                    <p className="text-sm">다른 장소를 검색해보세요!</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 text-gray-500">
                                        <div className="text-4xl mb-4">🎯</div>
                                        <p className="text-lg mb-2">빠른 시일 내에</p>
                                        <p className="text-sm">멋진 코스를 준비하겠습니다!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 패널 토글 버튼 */}
                    <button
                        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                        className="absolute top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-r-lg px-2 py-4 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out z-20"
                        style={{ left: leftPanelOpen ? "24rem" : "0" }}
                    >
                        <span className="text-gray-600 text-sm">{leftPanelOpen ? "◀" : "▶"}</span>
                    </button>

                    {/* 지도 영역 */}
                    <div className="flex-1 h-full relative">
                        <div ref={mapRef} className="w-full h-full" />

                        {/* 현재 지도 영역 검색 버튼 */}
                        {showMapSearchButton && !loading && !error && (
                            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                                <button
                                    onClick={() => {
                                        if (mapInstance.current) {
                                            const center = mapInstance.current.getCenter();
                                            const currentLocation = {
                                                lat: center.getLat(),
                                                lng: center.getLng(),
                                            };
                                            searchNearbyPlaces(currentLocation);
                                            setShowMapSearchButton(false);
                                        }
                                    }}
                                    disabled={isSearchingMapArea}
                                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-full shadow-lg transition-all duration-200 flex items-center gap-1 text-sm"
                                >
                                    {isSearchingMapArea ? (
                                        <>
                                            <LoadingSpinner text="검색 중..." />
                                        </>
                                    ) : (
                                        <>
                                            <span>🔍</span>
                                            <span>현재 지도에서 검색</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 지도 컨트롤 버튼들 (화면에 고정) */}
            {!loading && !error && (
                <>
                    {/* 내 위치로 이동 버튼 */}
                    <button
                        onClick={moveToMyLocation}
                        className="fixed bottom-6 right-6 bg-white border border-gray-300 rounded-lg p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 z-50"
                        title="내 위치로 이동"
                    >
                        <div className="w-6 h-6 text-blue-500">📍</div>
                    </button>

                    {/* 확대 버튼 */}
                    <button
                        onClick={handleZoomIn}
                        className="fixed top-25 right-6 bg-white border border-gray-300 rounded-lg p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 z-50"
                        title="확대"
                    >
                        <div className="w-6 h-6 text-blue-500">➕</div>
                    </button>

                    {/* 축소 버튼 */}
                    <button
                        onClick={handleZoomOut}
                        className="fixed top-40 right-6 bg-white border border-gray-300 rounded-lg p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 z-50"
                        title="축소"
                    >
                        <div className="w-6 h-6 text-blue-500">➖</div>
                    </button>
                </>
            )}
        </>
    );
}
