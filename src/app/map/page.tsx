"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
        naver: any;
    }
}

const LoadingSpinner = ({ text = "로딩 중..." }: { text?: string }) => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
        <p className="mt-2 ml-3 text-gray-600">{text}</p>
    </div>
);

// --- 메인 페이지 컴포넌트 ---
function MapPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const searchQuery = searchParams?.get("search");
    const hasQueryTarget = useMemo(() => {
        const lat = searchParams?.get("lat");
        const lng = searchParams?.get("lng");
        return !!(lat && lng);
    }, [searchParams]);

    // 페이지 로드 시 스크롤을 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // --- 상태 관리 ---
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isNaverReady, setIsNaverReady] = useState(false);
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
    const [isMobile, setIsMobile] = useState(false);

    // --- 지도 관련 ref ---
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const lastCenterRef = useRef<any>(null);

    // --- 유틸 함수들 ---
    const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
        setToast({ message, type });
    }, []);

    // 모바일 최초 진입 시 좌측 패널 닫기 (화면 가로폭이 좁은 경우)
    useEffect(() => {
        if (typeof window !== "undefined") {
            const check = () => {
                const mobile = window.innerWidth < 768;
                setIsMobile(mobile);
                if (mobile) setLeftPanelOpen(false);
            };
            check();
            window.addEventListener("resize", check);
            return () => window.removeEventListener("resize", check);
        }
    }, []);

    // Naver SDK 로드 대기 (스크립트가 늦게 로드되어도 초기화되도록 보장)
    useEffect(() => {
        if (typeof window === "undefined") return;
        let attempts = 0;
        const timer = setInterval(() => {
            if (window.naver?.maps) {
                setIsNaverReady(true);
                clearInterval(timer);
            } else if (++attempts > 50) {
                // 최대 ~10초 대기 후 중단
                clearInterval(timer);
            }
        }, 200);
        return () => clearInterval(timer);
    }, []);

    // --- 데이터 로딩 및 검색 로직 (카카오 API 사용) ---
    const searchNearbyPlaces = useCallback(async (location: UserLocation, keyword?: string) => {
        setLoading(true);
        setError(null);
        try {
            // 캐시된 데이터 확인
            const cacheKey = `places_${location.lat}_${location.lng}_${keyword || "default"}`;
            const cachedData = sessionStorage.getItem(cacheKey);
            const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
            const now = Date.now();

            // 10분 이내 캐시된 데이터가 있으면 사용
            if (cachedData && cacheTime && now - parseInt(cacheTime) < 10 * 60 * 1000) {
                const data = JSON.parse(cachedData);
                setPlaces(data);
                setLoading(false);
                return;
            }

            const keywords = keyword ? [keyword] : ["음식점", "카페", "관광명소"];
            const searchPromises = keywords.map((searchKeyword) =>
                fetch(`/api/places/search?lat=${location.lat}&lng=${location.lng}&keyword=${searchKeyword}`, {
                    cache: "force-cache",
                    next: { revalidate: 600 }, // 10분 캐시
                }).then((res) => res.json())
            );

            const results = await Promise.all(searchPromises);

            const newPlaces = results.flatMap((result) => result.places || []);
            // 중복 제거
            const uniquePlaces = Array.from(new Map(newPlaces.map((p) => [p.id, p])).values());

            // 폴백: 카카오 검색이 비었으면 DB places API 사용
            if (uniquePlaces.length === 0) {
                try {
                    const dbRes = await fetch(`/api/places?lat=${location.lat}&lng=${location.lng}`);
                    const dbData = await dbRes.json();
                    const dbPlaces = (dbData?.places || []) as Place[];
                    if (dbPlaces.length > 0) {
                        setPlaces(dbPlaces as any);
                        sessionStorage.setItem(cacheKey, JSON.stringify(dbPlaces));
                        sessionStorage.setItem(`${cacheKey}_time`, now.toString());
                        return;
                    }
                } catch {}
            }

            setPlaces(uniquePlaces);

            // 데이터를 캐시에 저장
            sessionStorage.setItem(cacheKey, JSON.stringify(uniquePlaces));
            sessionStorage.setItem(`${cacheKey}_time`, now.toString());
        } catch (e) {
            setError("주변 장소를 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    }, []);

    // --- 지도 초기화 및 마커 로직 (Naver) ---
    useEffect(() => {
        if (isNaverReady && window.naver?.maps && mapRef.current) {
            const center = userLocation
                ? new window.naver.maps.LatLng(userLocation.lat, userLocation.lng)
                : new window.naver.maps.LatLng(37.5665, 126.978);
            mapInstance.current = new window.naver.maps.Map(mapRef.current, {
                center,
                zoom: 12,
            });
            lastCenterRef.current = mapInstance.current.getCenter();

            window.naver.maps.Event.addListener(mapInstance.current, "idle", () => {
                setShowMapSearchButton(true);
            });
            window.naver.maps.Event.addListener(mapInstance.current, "click", () => {
                setSelectedPlace(null);
            });
        }
    }, [userLocation, isNaverReady]);

    // 마커 업데이트 Hook
    useEffect(() => {
        if (!mapInstance.current || !(window as any).naver?.maps) return;

        const map = mapInstance.current;
        const markers: any[] = [];

        // 기존 마커 즉시 제거 (보수적 정리)
        if (markersRef.current.length > 0) {
            try {
                markersRef.current.forEach((m) => m.marker && m.marker.setMap(null));
            } catch (e) {
                // noop
            }
            markersRef.current = [];
        }

        const bounds = new (window as any).naver.maps.LatLngBounds();

        // 현재 위치 마커 생성 (선택된 핀이 없을 때만 표시)
        if (userLocation && !selectedPlace) {
            const currentPosition = new (window as any).naver.maps.LatLng(userLocation.lat, userLocation.lng);

            // 현재 위치 커스텀 마커 생성 (모든 마커 크기 통일)
            const markerWidth = 44;
            const markerHeight = 44;

            const currentLocationMarker = new (window as any).naver.maps.Marker({
                position: currentPosition,
                title: "현재 위치",
                icon: {
                    content:
                        '<div style="width:18px;height:18px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 0 0 2px rgba(16,185,129,.3)"></div>',
                },
            });
            currentLocationMarker.setMap(map);

            // 현재 위치 마커 클릭 이벤트
            (window as any).naver.maps.Event.addListener(currentLocationMarker, "click", () => {
                console.log("현재 위치 핀 클릭됨");
                showToast("현재 위치입니다.", "info");
            });

            markers.push(currentLocationMarker);
            bounds.extend(currentPosition);
        }

        // 장소 마커 생성
        // 모바일: 항상 전체 핀 노출
        // 데스크탑: 선택 시 해당 핀만 강조 (기존 동작 유지)
        const placesToRender = isMobile ? places : selectedPlace ? [selectedPlace] : places;
        placesToRender.forEach((place) => {
            const isSelected = selectedPlace?.id === place.id;
            const position = new (window as any).naver.maps.LatLng(place.latitude, place.longitude);

            // 카테고리별 마커 이미지 결정
            let markerIcon: any;
            // 네이버는 content HTML 아이콘 사용

            // 카테고리/이름 기반 판별 유틸
            const lowerName = (place.name || "").toLowerCase();
            const lowerCategory = (place.category || "").toLowerCase();
            const restaurantKeywords = [
                "식당",
                "맛집",
                "음식",
                "한식",
                "중식",
                "중국요리",
                "일식",
                "스시",
                "라멘",
                "라면",
                "카레",
                "분식",
                "국수",
                "찌개",
                "백반",
                "먹자골목",
                "치킨",
                "피자",
                "버거",
                "햄버거",
                "스테이크",
                "파스타",
                "샐러드",
                "삼겹",
                "고기",
                "바베큐",
                "bbq",
                "돼지",
                "소고기",
                "족발",
                "보쌈",
                "막창",
                "곱창",
            ];
            const cafeKeywords = ["카페", "coffee", "커피", "디저트", "dessert"];

            const isRestaurant =
                restaurantKeywords.some((kw) => lowerName.includes(kw) || lowerCategory.includes(kw)) ||
                ["restaurant", "food"].some((kw) => lowerCategory.includes(kw));
            const isCafe = cafeKeywords.some((kw) => lowerName.includes(kw) || lowerCategory.includes(kw));

            if (isCafe) {
                markerIcon = {
                    content:
                        '<img src="/images/cafeMaker.png" style="width:38px;height:38px;transform:translate(-50%,-100%)" />',
                };
            } else if (isRestaurant) {
                markerIcon = {
                    content:
                        '<img src="/images/maker1.png" style="width:38px;height:38px;transform:translate(-50%,-100%)" />',
                };
            } else {
                // 기본 마커
                const markerColor = "#45B7D1";
                markerIcon = {
                    content: `<div style=\"transform:translate(-50%,-100%);width:22px;height:22px;border-radius:50%;background:${markerColor};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.25)\"></div>`,
                };
            }

            // 마커 생성
            const marker = new (window as any).naver.maps.Marker({
                position,
                title: place.name,
                icon: markerIcon,
                zIndex: isSelected ? 20 : 10,
                clickable: true,
            });
            marker.setMap(map);

            // 마커 클릭 이벤트 (지도 위 정보창 없이 왼쪽 패널에만 표시)
            (window as any).naver.maps.Event.addListener(marker, "click", () => {
                console.log("핀 클릭됨:", place.name);
                // 선택된 장소로 상태 설정
                setSelectedPlace(place);
            });

            // 경계 확장
            bounds.extend(position);

            // 목록 관리를 위한 저장
            markers.push({ marker, infoWindow: null });
        });
        markersRef.current = markers;

        // 경계 적용 (선택된 핀 하나만 보일 때는 약간 확대)
        if (!bounds.isEmpty()) {
            try {
                if (selectedPlace) {
                    map.setCenter(
                        new (window as any).naver.maps.LatLng(selectedPlace.latitude, selectedPlace.longitude)
                    );
                    map.setZoom(15);
                } else {
                    map.fitBounds(bounds);
                }
            } catch (e) {
                // noop
            }
        }
    }, [places, selectedPlace, userLocation, isMobile, showToast]);

    // --- 초기 데이터 로드 ---
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = { lat: position.coords.latitude, lng: position.coords.longitude };
                setUserLocation(location);
                if (!hasQueryTarget) {
                    searchNearbyPlaces(location);
                }
            },
            () => {
                const defaultLocation = { lat: 37.5665, lng: 126.978 };
                setUserLocation(defaultLocation);
                if (!hasQueryTarget) {
                    searchNearbyPlaces(defaultLocation);
                }
            }
        );
    }, [searchNearbyPlaces, hasQueryTarget]);

    // URL로 전달된 특정 장소(lat,lng,name)가 있으면 해당 위치를 핀으로 표시
    useEffect(() => {
        const latStr = searchParams?.get("lat");
        const lngStr = searchParams?.get("lng");
        if (!latStr || !lngStr) return;

        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return;

        const name = decodeURIComponent(searchParams?.get("name") || "선택한 장소");

        const placeFromQuery: Place = {
            id: -1,
            name,
            address: "",
            latitude: lat,
            longitude: lng,
            category: "선택한 장소",
            distance: "0m",
            description: name,
            rating: 5.0,
            imageUrl: "/images/placeholder-location.jpg",
        };

        setSearchedPlace(placeFromQuery);
        setPlaces([placeFromQuery]);
        setSelectedPlace(placeFromQuery);
        setActiveTab("places");

        if (mapInstance.current && (window as any).naver?.maps) {
            mapInstance.current.panTo(new (window as any).naver.maps.LatLng(lat, lng));
        }
    }, [searchParams]);

    // 모바일에서 핀이 비어있을 때 자동 재검색 폴백
    useEffect(() => {
        if (isMobile && userLocation && places.length === 0 && !loading) {
            searchNearbyPlaces(userLocation);
        }
    }, [isMobile, userLocation, places.length, loading, searchNearbyPlaces]);

    // 지도 준비 후 places가 비면 지도 중심으로 재검색 (F5 새로고침 대응)
    useEffect(() => {
        if (!isMobile || places.length > 0 || loading) return;
        if (mapInstance.current && (window as any).naver?.maps) {
            try {
                const center = mapInstance.current.getCenter();
                if (center) {
                    searchNearbyPlaces({ lat: center.getLat(), lng: center.getLng() });
                }
            } catch {}
        }
    }, [isMobile, places.length, loading, searchNearbyPlaces]);

    // 장소명 검색 후 결과 반영 시 지도 이동 (선택된 장소 기준)
    useEffect(() => {
        if (!searchedPlace) return;
        // 검색된 장소로 지도 이동
        if (mapInstance.current) {
            mapInstance.current.panTo(new (window as any).naver.maps.LatLng(searchedPlace.lat, searchedPlace.lng));
        }
    }, [searchedPlace]);

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
                mapInstance.current.panTo(new (window as any).naver.maps.LatLng(foundPlace.lat, foundPlace.lng));
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

    // 바텀시트(목록 패널) 상태 초기화
    const resetPanelState = useCallback(
        (closePanel: boolean = false) => {
            setSelectedPlace(null);
            setSearchedPlace(null);
            setActiveTab("places");
            setCourses([]);
            setSearchInput("");
            if (isMobile && closePanel) {
                setLeftPanelOpen(false);
            }
        },
        [isMobile]
    );

    const moveToMyLocation = useCallback(() => {
        if (mapInstance.current && userLocation && (window as any).naver?.maps) {
            mapInstance.current.panTo(new window.naver.maps.LatLng(userLocation.lat, userLocation.lng));
            showToast("내 위치로 이동했습니다.", "info");
            // 1초 뒤 자동으로 토스트 숨기기
            setTimeout(() => setToast(null), 1000);
        }
    }, [userLocation, showToast, setToast]);

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

    const handlePlaceClick = useCallback(
        (place: Place) => {
            setSelectedPlace(place);
            if (mapInstance.current) {
                const latlng = new (window as any).naver.maps.LatLng(place.latitude, place.longitude);
                mapInstance.current.panTo(latlng);
            }
            // 모바일에서 목록 클릭 시에도 정보 패널이 보이도록 열기
            if (isMobile && !leftPanelOpen) setLeftPanelOpen(true);
        },
        [isMobile, leftPanelOpen]
    );

    // 네이버 지도에서 장소명으로 검색 열기
    const handleOpenKakaoSearch = useCallback((place: Place) => {
        const url = `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}`;
        window.open(url, "_blank");
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

            <div
                className="h-[100dvh] overflow-hidden bg-white flex flex-col pt-18 text-black"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                <div className="flex-1 flex relative min-h-0">
                    {/* 왼쪽 패널 */}
                    <div
                        className={
                            isMobile
                                ? `fixed inset-x-0 bottom-0 z-[60] transition-transform duration-300 ease-in-out ${
                                      leftPanelOpen ? "translate-y-0" : "translate-y-full"
                                  }`
                                : `bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
                                      leftPanelOpen ? "sm:w-96 w-full" : "w-0"
                                  } overflow-hidden z-20 flex-shrink-0 h-full`
                        }
                    >
                        <div
                            className={
                                isMobile
                                    ? "h-[50dvh] max-h-[50dvh] bg-white rounded-t-2xl shadow-2xl flex flex-col w-full"
                                    : "h-full flex flex-col w-full sm:w-96"
                            }
                        >
                            {isMobile && (
                                <div className="w-full flex items-center justify-center py-2">
                                    <button
                                        onClick={() => resetPanelState(true)}
                                        aria-label="패널 닫기"
                                        className="w-12 h-1.5 bg-gray-300 rounded-full active:bg-gray-400"
                                        title="아래로 내리기"
                                    />
                                </div>
                            )}
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
                                        className="hover:cursor-pointer absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                                    >
                                        검색
                                    </button>
                                </div>
                            </div>

                            {/* 탭 */}
                            <div className="flex border-b border-gray-200 bg-white">
                                <button
                                    onClick={() => setActiveTab("places")}
                                    className={`flex-1 py-4 px-6 text-sm font-medium transition-colors hover:cursor-pointer ${
                                        activeTab === "places"
                                            ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                                            : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                    }`}
                                >
                                    주변 장소 ({places.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab("courses")}
                                    className={`flex-1 py-4 px-6 text-sm font-medium transition-colors hover:cursor-pointer ${
                                        activeTab === "courses"
                                            ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                                            : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                    }`}
                                >
                                    추천 코스 ({courses.length})
                                </button>
                            </div>

                            {/* 컨텐츠 */}
                            <div className={`flex-1 overflow-y-auto bg-gray-50 ${isMobile ? "rounded-b-2xl" : ""}`}>
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
                                            <div
                                                className={`bg-white rounded-lg ${
                                                    isMobile ? "p-4" : "p-6"
                                                } border border-gray-200 shadow-md`}
                                            >
                                                <div
                                                    className={`flex items-start justify-between ${
                                                        isMobile ? "mb-3" : "mb-4"
                                                    }`}
                                                >
                                                    <h3
                                                        className={`${
                                                            isMobile ? "text-lg" : "text-xl"
                                                        } font-bold text-gray-900`}
                                                    >
                                                        {selectedPlace.name}
                                                    </h3>
                                                    <button
                                                        onClick={() => resetPanelState(false)}
                                                        className="hover:cursor-pointer text-gray-400 hover:text-gray-600 text-xl"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`${
                                                                isMobile ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
                                                            } bg-blue-100 text-blue-700 rounded-full font-medium`}
                                                        >
                                                            {selectedPlace.category}
                                                        </span>
                                                        <span
                                                            className={`${
                                                                isMobile ? "text-sm" : "text-base"
                                                            } text-gray-600`}
                                                        >
                                                            📍 {selectedPlace.distance}
                                                        </span>
                                                        <span className={`${isMobile ? "text-sm" : "text-base"}`}>
                                                            ⭐ {selectedPlace.rating}
                                                        </span>
                                                    </div>
                                                    <div className="text-gray-700">
                                                        <p
                                                            className={`${
                                                                isMobile ? "text-sm" : "text-base"
                                                            } font-medium mb-1`}
                                                        >
                                                            주소
                                                        </p>
                                                        <p className={`${isMobile ? "text-xs" : "text-sm"}`}>
                                                            {selectedPlace.address}
                                                        </p>
                                                    </div>

                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            onClick={() => handleOpenKakaoSearch(selectedPlace)}
                                                            className={`hover:cursor-pointer flex-1 bg-blue-600 text-white ${
                                                                isMobile ? "py-2" : "py-2"
                                                            } px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors`}
                                                        >
                                                            길찾기
                                                        </button>
                                                        {selectedPlace.phone && (
                                                            <button className="hover:cursor-pointer flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
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
                                                                <button
                                                                    onClick={() => handleOpenKakaoSearch(place)}
                                                                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                                                                >
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
                                ) : (
                                    <div className="p-4 space-y-4">
                                        {/* 코스 목록 */}
                                        <div className="space-y-3">
                                            {courses.length > 0 ? (
                                                courses.map((course) => (
                                                    <div
                                                        key={course.id}
                                                        onClick={() => router.push(`/courses/${course.id}`)}
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
                                                            <p
                                                                className="text-sm text-gray-500"
                                                                style={{
                                                                    display: "-webkit-box",
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: "vertical",
                                                                    overflow: "hidden",
                                                                }}
                                                            >
                                                                {course.description || "멋진 코스입니다!"}
                                                            </p>
                                                            <div className="hover:cursor-pointer flex gap-2 mt-3">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.push(`/courses/${course.id}`);
                                                                    }}
                                                                    className="hover:cursor-pointer text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition-colors text-blue-700"
                                                                >
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
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 패널 토글 버튼 */}
                    {!isMobile && (
                        <button
                            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                            className="absolute top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-r-lg px-2 py-4 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out z-20"
                            style={{ left: leftPanelOpen ? "24rem" : "0" }}
                        >
                            <span className="text-gray-600 text-sm hover:cursor-pointer">
                                {leftPanelOpen ? "◀" : "▶"}
                            </span>
                        </button>
                    )}

                    {/* 지도 영역 */}
                    <div className="flex-1 h-full relative min-h-0 overflow-hidden">
                        <div ref={mapRef} className="w-full h-full" />

                        {/* 현재 지도 영역 검색 버튼 */}
                        {!loading &&
                            !error &&
                            ((isMobile && !leftPanelOpen && showMapSearchButton) ||
                                (!isMobile && showMapSearchButton)) && (
                                <div
                                    className={`absolute ${
                                        isMobile ? "bottom-24" : "bottom-6"
                                    } left-1/2 transform -translate-x-1/2 z-[80]`}
                                >
                                    <button
                                        onClick={async () => {
                                            if (mapInstance.current) {
                                                const center = mapInstance.current.getCenter();
                                                const currentLocation = {
                                                    lat: center.getLat(),
                                                    lng: center.getLng(),
                                                };
                                                try {
                                                    setIsSearchingMapArea(true);
                                                    await searchNearbyPlaces(currentLocation);
                                                } finally {
                                                    setIsSearchingMapArea(false);
                                                    setShowMapSearchButton(false);
                                                }
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

                        {/* 모바일 오픈 버튼 복원 */}
                        {isMobile && !leftPanelOpen && !showMapSearchButton && (
                            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[60]">
                                <button
                                    onClick={() => setLeftPanelOpen(true)}
                                    className="bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-full shadow-md"
                                >
                                    목록 보기
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 지도 컨트롤 버튼들 (화면에 고정) */}
            {!loading && !error && (
                <>
                    {isMobile ? (
                        <div
                            className="fixed right-4 bottom-20 z-50 flex flex-col items-end gap-2"
                            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                        >
                            <button
                                onClick={moveToMyLocation}
                                title="내 위치로 이동"
                                className="hover:cursor-pointer rounded-full bg-white border border-gray-300 p-3 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 hover:bg-gray-50"
                            >
                                <span className="text-blue-600">📍</span>
                            </button>
                            <div className="bg-white rounded-full border border-gray-300 shadow-lg overflow-hidden flex flex-col">
                                <button
                                    onClick={handleZoomIn}
                                    title="확대"
                                    className="hover:cursor-pointer p-3 active:bg-gray-50"
                                >
                                    <span className="text-blue-600">➕</span>
                                </button>
                                <div className="h-px bg-gray-200" />
                                <button
                                    onClick={handleZoomOut}
                                    title="축소"
                                    className="hover:cursor-pointer p-3 active:bg-gray-50"
                                >
                                    <span className="text-blue-600">➖</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={moveToMyLocation}
                                className="hover:cursor-pointer fixed bottom-6 right-6 p-3 bg-white border border-gray-300 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 z-50"
                                title="내 위치로 이동"
                            >
                                <div className="w-6 h-6 text-blue-500">📍</div>
                            </button>
                            <button
                                onClick={handleZoomIn}
                                className="hover:cursor-pointer fixed top-25 right-6 bg-white border border-gray-300 rounded-lg p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 z-50"
                                title="확대"
                            >
                                <div className="w-6 h-6 text-blue-500">➕</div>
                            </button>
                            <button
                                onClick={handleZoomOut}
                                className="hover:cursor-pointer fixed top-40 right-6 bg-white border border-gray-300 rounded-lg p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 z-50"
                                title="축소"
                            >
                                <div className="w-6 h-6 text-blue-500">➖</div>
                            </button>
                        </>
                    )}
                </>
            )}
        </>
    );
}

export default function MapPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-600">로딩 중...</div>}>
            <MapPageInner />
        </Suspense>
    );
}
