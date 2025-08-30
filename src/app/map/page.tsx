"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

interface Place {
    name: string;
    crowd: string;
    type: string;
    distance: string;
    address: string;
    category: string;
}

export default function MapPage() {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const router = useRouter();
    const [currentLocation, setCurrentLocation] = useState<string>("위치 확인 중");
    const [isLoading, setIsLoading] = useState(true);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [crowdLevel, setCrowdLevel] = useState<string>("보통");
    const [popularPlaces, setPopularPlaces] = useState<Place[]>([]);
    const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
    const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [currentRegion, setCurrentRegion] = useState<string>("");

    // 혼잡도에 따른 색상 반환 함수
    const getCrowdColor = (crowd: string) => {
        switch (crowd) {
            case "매우 혼잡":
                return "text-red-600 bg-red-50";
            case "혼잡":
                return "text-orange-600 bg-orange-50";
            case "보통":
                return "text-yellow-600 bg-yellow-50";
            case "여유":
                return "text-green-600 bg-green-50";
            default:
                return "text-gray-600 bg-gray-50";
        }
    };

    // 혼잡도에 따른 아이콘 반환 함수
    const getCrowdIcon = (crowd: string) => {
        switch (crowd) {
            case "매우 혼잡":
                return "🔥";
            case "혼잡":
                return "⚠️";
            case "보통":
                return "😐";
            case "여유":
                return "😌";
            default:
                return "❓";
        }
    };

    // 거리 계산 함수
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
        const R = 6371; // 지구의 반지름 (km)
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance < 1) {
            return `${Math.round(distance * 1000)}m`;
        } else {
            return `${distance.toFixed(1)}km`;
        }
    };

    // 혼잡도 예측 함수 (실제로는 API에서 받아와야 함)
    const predictCrowdLevel = (): string => {
        const crowdLevels = ["여유", "보통", "혼잡", "매우 혼잡"];
        const randomIndex = Math.floor(Math.random() * crowdLevels.length);
        return crowdLevels[randomIndex];
    };

    // 카테고리별 아이콘 반환 함수
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "음식점":
                return "🍽️";
            case "카페":
                return "☕";
            case "문화시설":
                return "🎭";
            case "관광지":
                return "🗺️";
            case "교통":
                return "🚇";
            case "쇼핑":
                return "🛍️";
            case "공원":
                return "🌳";
            default:
                return "📍";
        }
    };

    const generatePlaceNames = (region: string) => {
        const regionNames = {
            강남구: ["강남역", "역삼역", "선릉역", "삼성역", "압구정역"],
            서초구: ["서초역", "교대역", "방배역", "사당역", "양재역"],
            마포구: ["홍대입구역", "합정역", "당산역", "마포구청역", "상암역"],
            용산구: ["용산역", "이태원역", "한강진역", "녹사평역", "삼각지역"],
            중구: ["시청역", "을지로입구역", "명동역", "동대문역", "종로3가역"],
            종로구: ["종각역", "안국역", "경복궁역", "독립문역", "서대문역"],
            성동구: ["성수역", "뚝섬역", "한양대역", "왕십리역", "상왕십리역"],
            광진구: ["건대입구역", "구의역", "강변역", "잠실나루역", "잠실역"],
            송파구: ["잠실역", "문정역", "장지역", "복정역", "가락시장역"],
            강동구: ["강동역", "천호역", "길동역", "굽은다리역", "명일역"],
            강북구: ["수유역", "미아역", "미아사거리역", "길음역", "성신여대입구역"],
            노원구: ["노원역", "창동역", "도봉역", "망월사역", "회룡역"],
            도봉구: ["도봉역", "도봉산역", "망월사역", "회룡역", "의정부역"],
            의정부시: ["의정부역", "회룡역", "망월사역", "도봉산역", "도봉역"],
            양천구: ["신정역", "목동역", "오목교역", "양천구청역", "까치산역"],
            구로구: ["구로역", "구로디지털단지역", "대림역", "신도림역", "영등포구청역"],
            영등포구: ["영등포구청역", "당산역", "합정역", "홍대입구역", "신촌역"],
            동작구: ["동작역", "사당역", "방배역", "교대역", "서초역"],
            관악구: ["봉천역", "신림역", "서울대입구역", "낙성대역", "사당역"],
            서대문구: ["신촌역", "이대역", "아현역", "충정로역", "시청역"],
            은평구: ["녹번역", "불광역", "연신내역", "구파발역", "지축역"],
            강서구: ["김포공항역", "송정역", "마곡역", "발산역", "우장산역"],
        };

        // 지역명에서 구/시 추출
        const district = Object.keys(regionNames).find((key) => region.includes(key));
        return district
            ? regionNames[district as keyof typeof regionNames]
            : ["주변 장소", "근처 카페", "주변 식당", "문화시설", "쇼핑몰"];
    };

    // 주변 장소 검색 함수
    const searchNearbyPlaces = async (lat: number, lng: number, region: string) => {
        if (!window.kakao?.maps?.services) {
            console.error("카카오맵 서비스 API가 로드되지 않았습니다.");
            return;
        }

        setIsLoadingPlaces(true);

        try {
            const categories = ["음식점", "카페", "문화시설", "관광지", "쇼핑"];
            const placeNames = generatePlaceNames(region);

            const places: Place[] = [];

            // 현재 위치에서 가까운 장소들을 생성
            for (let i = 0; i < 5; i++) {
                const randomLat = lat + (Math.random() - 0.5) * 0.01; // 약 1km 범위
                const randomLng = lng + (Math.random() - 0.5) * 0.01;
                const distance = calculateDistance(lat, lng, randomLat, randomLng);
                const category = categories[Math.floor(Math.random() * categories.length)];
                const name = placeNames[Math.floor(Math.random() * placeNames.length)];
                const crowd = predictCrowdLevel();

                places.push({
                    name: `${name} ${i + 1}`,
                    crowd,
                    type: category,
                    distance,
                    address: `${region} ${Math.floor(Math.random() * 100) + 1}번지`,
                    category,
                });
            }

            // 거리순으로 정렬
            places.sort((a, b) => {
                const distA = parseFloat(a.distance.replace("km", "").replace("m", ""));
                const distB = parseFloat(b.distance.replace("km", "").replace("m", ""));
                return distA - distB;
            });

            setPopularPlaces(places);

            // 현재 지역 혼잡도 업데이트
            const nearbyCrowded = places.filter((p) => p.crowd === "매우 혼잡" || p.crowd === "혼잡").length;
            if (nearbyCrowded >= 3) {
                setCrowdLevel("매우 혼잡");
            } else if (nearbyCrowded >= 1) {
                setCrowdLevel("혼잡");
            } else {
                setCrowdLevel("보통");
            }
        } catch (error) {
            console.error("주변 장소 검색 실패:", error);
            // 에러 시 기본 데이터 설정
            setPopularPlaces([
                {
                    name: "주변 카페",
                    crowd: "보통",
                    type: "카페",
                    distance: "0.3km",
                    address: `${region} 1번지`,
                    category: "카페",
                },
                {
                    name: "주변 공원",
                    crowd: "여유",
                    type: "공원",
                    distance: "0.8km",
                    address: `${region} 2번지`,
                    category: "공원",
                },
                {
                    name: "주변 역",
                    crowd: "혼잡",
                    type: "교통",
                    distance: "0.5km",
                    address: `${region} 3번지`,
                    category: "교통",
                },
            ]);
        } finally {
            setIsLoadingPlaces(false);
        }
    };

    // 실시간 데이터 업데이트 함수
    const updateRealTimeData = () => {
        if (currentCoords && currentRegion) {
            searchNearbyPlaces(currentCoords.lat, currentCoords.lng, currentRegion);
        }
    };

    useEffect(() => {
        const checkKakaoLoaded = () => {
            if (window.kakao?.maps?.Map) {
                console.log("카카오맵 API 로드됨");
                initializeMap();
            } else {
                // 아직 로드 안됨
                setTimeout(checkKakaoLoaded, 100);
            }
        };

        checkKakaoLoaded();

        const initializeMap = () => {
            if (!mapRef.current) {
                console.error("지도 컨테이너를 찾을 수 없습니다.");
                return;
            }

            // 카카오맵 API가 완전히 로드되었는지 확인
            if (!window.kakao?.maps?.LatLng || !window.kakao?.maps?.Map) {
                console.error("카카오맵 API가 아직 로드되지 않았습니다.");
                return;
            }

            console.log("지도 초기화 시작");

            // 현재 위치 가져오기
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;

                        console.log("현재 위치:", lat, lng);
                        setCurrentCoords({ lat, lng });

                        // 카카오맵 초기화
                        const options = {
                            center: new window.kakao.maps.LatLng(lat, lng),
                            level: 3,
                        };

                        if (mapRef.current) {
                            try {
                                mapInstanceRef.current = new window.kakao.maps.Map(mapRef.current, options);
                                console.log("지도 생성 성공");

                                // 현재 위치 마커 추가
                                const marker = new window.kakao.maps.Marker({
                                    position: new window.kakao.maps.LatLng(lat, lng),
                                });
                                marker.setMap(mapInstanceRef.current);

                                // 현재 위치 정보 표시
                                if (window.kakao?.maps?.services) {
                                    const geocoder = new window.kakao.maps.services.Geocoder();
                                    geocoder.coord2RegionCode(lng, lat, (result: unknown[], status: string) => {
                                        if (status === window.kakao.maps.services.Status.OK) {
                                            const firstResult = result[0] as {
                                                region_3depth_name?: string;
                                                region_2depth_name?: string;
                                                region_1depth_name?: string;
                                            };
                                            const region =
                                                firstResult?.region_3depth_name ||
                                                firstResult?.region_2depth_name ||
                                                "현재 위치";
                                            const fullRegion =
                                                firstResult?.region_1depth_name +
                                                    " " +
                                                    firstResult?.region_2depth_name || region;
                                            setCurrentLocation(region);
                                            setCurrentRegion(fullRegion);

                                            // 위치 확인 후 주변 장소 검색
                                            searchNearbyPlaces(lat, lng, fullRegion);
                                        }
                                    });
                                }

                                setIsLoading(false);
                            } catch (error) {
                                console.error("지도 생성 실패:", error);
                                setIsLoading(false);
                            }
                        }
                    },
                    (error) => {
                        console.error("위치 권한 거부 또는 오류:", error);

                        // 서울 시청을 기본 위치로 설정
                        const defaultLat = 37.5665;
                        const defaultLng = 126.978;

                        console.log("기본 위치로 설정:", defaultLat, defaultLng);
                        setCurrentCoords({ lat: defaultLat, lng: defaultLng });

                        const options = {
                            center: new window.kakao.maps.LatLng(defaultLat, defaultLng),
                            level: 3,
                        };

                        if (mapRef.current) {
                            try {
                                mapInstanceRef.current = new window.kakao.maps.Map(mapRef.current, options);
                                console.log("기본 위치 지도 생성 성공");
                                setCurrentLocation("서울 중구");
                                setCurrentRegion("서울 중구");
                                searchNearbyPlaces(defaultLat, defaultLng, "서울 중구");
                                setIsLoading(false);
                            } catch (error) {
                                console.error("기본 위치 지도 생성 실패:", error);
                                setIsLoading(false);
                            }
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000,
                    }
                );
            } else {
                // 위치 권한이 없는 경우 서울 시청을 기본 위치로 설정
                const defaultLat = 37.5665;
                const defaultLng = 126.978;

                console.log("위치 권한 없음, 기본 위치로 설정:", defaultLat, defaultLng);
                setCurrentCoords({ lat: defaultLat, lng: defaultLng });

                const options = {
                    center: new window.kakao.maps.LatLng(defaultLat, defaultLng),
                    level: 3,
                };

                if (mapRef.current) {
                    try {
                        mapInstanceRef.current = new window.kakao.maps.Map(mapRef.current, options);
                        console.log("기본 위치 지도 생성 성공");
                        setCurrentLocation("서울 중구");
                        setCurrentRegion("서울 중구");
                        searchNearbyPlaces(defaultLat, defaultLng, "서울 중구");
                        setIsLoading(false);
                    } catch (error) {
                        console.error("기본 위치 지도 생성 실패:", error);
                        setIsLoading(false);
                    }
                }
            }
        };

        // 카카오맵 로드 시작 (checkKakaoLoaded 함수가 이미 호출됨)

        // 실시간 데이터 업데이트 타이머 설정 (5분마다)
        const updateTimer = setInterval(updateRealTimeData, 5 * 60 * 1000);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current = null;
            }
            clearInterval(updateTimer);
        };
    }, []);

    return (
        <div className="h-screen w-full relative overflow-hidden bg-white">
            <div className="absolute top-0 left-0 right-0 z-30">
                <Header />
            </div>

            {/* 왼쪽 패널 */}
            <div
                className={`absolute top-0 left-0 h-full bg-gradient-to-b from-white to-gray-50 shadow-2xl transition-transform duration-300 z-20 ${
                    isPanelOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                style={{ width: "300px", marginTop: "64px" }}
            >
                <div className="p-6 h-full overflow-y-auto">
                    <div className="flex items-center mb-6">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">실시간 지도</h2>
                    </div>

                    <div className="space-y-4">
                        {/* 현재 위치 카드 */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center mb-2">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                                    <svg
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">현재 위치</h3>
                            </div>
                            <p className="text-sm text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                                {currentLocation}
                            </p>
                        </div>

                        {/* 실시간 혼잡도 카드 */}
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-100 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center mb-3">
                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                                    <svg
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">실시간 혼잡도</h3>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">현재 지역</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${getCrowdColor(crowdLevel)}`}>
                                        {getCrowdIcon(crowdLevel)} {crowdLevel}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    마지막 업데이트: {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        </div>

                        {/* 인기 장소 카드 */}
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                                        <svg
                                            className="w-3 h-3 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-gray-800">주변 인기 장소</h3>
                                </div>
                                <button
                                    onClick={updateRealTimeData}
                                    disabled={isLoadingPlaces}
                                    className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
                                >
                                    {isLoadingPlaces ? "업데이트 중..." : "새로고침"}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {isLoadingPlaces ? (
                                    <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                                        <p className="text-xs text-gray-500">주변 장소 검색 중...</p>
                                    </div>
                                ) : popularPlaces.length > 0 ? (
                                    popularPlaces.map((place, index) => (
                                        <div
                                            key={index}
                                            className="bg-white rounded-lg p-3 border border-gray-100 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center">
                                                    <span className="text-sm mr-1">
                                                        {getCategoryIcon(place.category)}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-800">
                                                        {place.name}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-xs px-2 py-1 rounded-full ${getCrowdColor(
                                                        place.crowd
                                                    )}`}
                                                >
                                                    {getCrowdIcon(place.crowd)} {place.crowd}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>{place.type}</span>
                                                <span>{place.distance}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">{place.address}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-xs text-gray-500">주변 장소를 찾을 수 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 빠른 메뉴 카드 */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center mb-3">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
                                    <svg
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">빠른 메뉴</h3>
                            </div>
                            <div className="space-y-2">
                                <button className="w-full text-left p-3 hover:bg-white hover:shadow-md rounded-lg text-sm text-gray-700 transition-all duration-200 flex items-center group">
                                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-orange-200 transition-colors">
                                        <svg
                                            className="w-4 h-4 text-orange-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                    <span className="font-medium">주변 카페 찾기</span>
                                </button>
                                <button className="w-full text-left p-3 hover:bg-white hover:shadow-md rounded-lg text-sm text-gray-700 transition-all duration-200 flex items-center group">
                                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-red-200 transition-colors">
                                        <svg
                                            className="w-4 h-4 text-red-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zM6 10h7a2 2 0 012 2v1H4v-1a2 2 0 012-2z"
                                            />
                                        </svg>
                                    </div>
                                    <span className="font-medium">주변 식당 찾기</span>
                                </button>
                                <button className="w-full text-left p-3 hover:bg-white hover:shadow-md rounded-lg text-sm text-gray-700 transition-all duration-200 flex items-center group">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                                        <svg
                                            className="w-4 h-4 text-blue-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                            />
                                        </svg>
                                    </div>
                                    <span className="font-medium">주변 편의점 찾기</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 패널 토글 버튼 - 패널 내부에 배치 */}
                <button
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className="absolute bg-white rounded-lg shadow-lg p-3 z-30 hover:bg-gray-50 transition-all duration-300 cursor-pointer"
                    style={{
                        top: "45%", // 50%에서 45%로 올림
                        right: "-40px", // 패널 오른쪽 가장자리에 완전히 붙임
                        transform: "translateY(-50%)",
                        marginTop: "32px", // 헤더 높이의 절반만큼 조정
                        width: "40px", // 가로 크기 줄임
                        height: "60px", // 세로 크기 늘림
                        padding: "8px 6px", // 패딩 조정
                        borderRadius: "0 8px 8px 0", // 오른쪽만 둥글게
                    }}
                >
                    <svg
                        className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
                            isPanelOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>

            {/* 지도 컨테이너 */}
            <div
                className="w-full h-full absolute top-0 left-0 right-0 bottom-0"
                style={{ height: "calc(100vh - 64px)", marginTop: "64px" }}
            >
                {/* 로딩 화면 */}
                {isLoading && (
                    <div className="absolute inset-0 bg-white z-10 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">지도를 불러오는 중...</p>
                        </div>
                    </div>
                )}

                {/* 지도 */}
                <div ref={mapRef} className="w-full h-full" style={{ overflow: "hidden" }} />

                {/* 뒤로가기 버튼 */}
                <button
                    onClick={() => router.back()}
                    className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-20 hover:bg-gray-50 transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* 지도 컨트롤 */}
                <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-20">
                    {/* 현재 위치로 가기 버튼 */}
                    <button
                        onClick={() => {
                            // 카카오맵 API가 완전히 로드되었는지 확인
                            if (!window.kakao?.maps?.LatLng || !window.kakao?.maps?.Map) {
                                console.error("카카오맵 API가 아직 로드되지 않았습니다.");
                                alert("지도가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
                                return;
                            }

                            if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                        const lat = position.coords.latitude;
                                        const lng = position.coords.longitude;

                                        if (mapInstanceRef.current) {
                                            const newCenter = new window.kakao.maps.LatLng(lat, lng);
                                            mapInstanceRef.current.setCenter(newCenter);
                                            mapInstanceRef.current.setLevel(3);

                                            // 새로운 위치에서 주변 장소 검색
                                            setCurrentCoords({ lat, lng });

                                            // 새로운 위치의 지역명 가져오기
                                            if (window.kakao?.maps?.services) {
                                                const geocoder = new window.kakao.maps.services.Geocoder();
                                                geocoder.coord2RegionCode(
                                                    lng,
                                                    lat,
                                                    (result: unknown[], status: string) => {
                                                        if (status === window.kakao.maps.services.Status.OK) {
                                                            const firstResult = result[0] as {
                                                                region_3depth_name?: string;
                                                                region_2depth_name?: string;
                                                                region_1depth_name?: string;
                                                            };
                                                            const region =
                                                                firstResult?.region_3depth_name ||
                                                                firstResult?.region_2depth_name ||
                                                                "현재 위치";
                                                            const fullRegion =
                                                                firstResult?.region_1depth_name +
                                                                    " " +
                                                                    firstResult?.region_2depth_name || region;
                                                            setCurrentLocation(region);
                                                            setCurrentRegion(fullRegion);
                                                            searchNearbyPlaces(lat, lng, fullRegion);
                                                        }
                                                    }
                                                );
                                            }
                                        }
                                    },
                                    (error) => {
                                        console.error("위치 권한 거부 또는 오류:", error);
                                        alert("현재 위치를 가져올 수 없습니다.");
                                    }
                                );
                            } else {
                                alert("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
                            }
                        }}
                        className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
                        title="현재 위치로 이동"
                    >
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    </button>

                    <button
                        onClick={() => {
                            if (mapInstanceRef.current) {
                                mapInstanceRef.current.setLevel(mapInstanceRef.current.getLevel() + 1);
                            }
                        }}
                        className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            if (mapInstanceRef.current) {
                                mapInstanceRef.current.setLevel(mapInstanceRef.current.getLevel() - 1);
                            }
                        }}
                        className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </button>
                </div>
            </div>
            {/* 모바일 하단 네비게이션을 위한 여백 */}
            <div className="md:hidden h-20"></div>
        </div>
    );
}
