"use client";

import { useEffect, useRef, useState } from "react";
import { KakaoMapProps } from "@/types/map";

// 카카오맵 전역 타입 정의
declare global {
    interface Window {
        kakao: any;
    }
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">지도 로딩 중...</span>
    </div>
);

// [개선] 훨씬 간결해진 KakaoMap 컴포넌트
export default function KakaoMap({
    places,
    userLocation,
    selectedPlace,
    onPlaceClick,
    className = "",
    style = {},
    draggable = true,
    drawPath = false,
    routeMode = "simple",
}: KakaoMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const polylineRef = useRef<any>(null);
    const resolvedPositionsRef = useRef<Record<number, any>>({});
    const [isMapReady, setIsMapReady] = useState(false);

    // 1. 지도 초기화 Hook: 컴포넌트가 처음 마운트될 때 한 번만 실행
    useEffect(() => {
        if (!window.kakao || !mapRef.current || mapInstance.current) return;

        // kakao.maps.load()를 사용하여 API가 완전히 준비되도록 보장
        window.kakao.maps.load(() => {
            // 지도의 중심 좌표 설정
            let centerPosition;
            let zoomLevel = 5;

            if (places.length > 0) {
                // 첫 번째 장소를 중심으로 설정
                centerPosition = new window.kakao.maps.LatLng(places[0].latitude, places[0].longitude);
                // 장소가 하나면 더 가까운 줌 레벨로 설정
                zoomLevel = places.length === 1 ? 2 : 4;
                console.log(`첫 번째 장소로 포커스: ${places[0].name} (${places[0].latitude}, ${places[0].longitude})`);
            } else if (userLocation) {
                centerPosition = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
                zoomLevel = 3;
            } else {
                // 기본값: 서울 시청
                centerPosition = new window.kakao.maps.LatLng(37.5665, 126.978);
                zoomLevel = 5;
            }

            const mapOptions = {
                center: centerPosition,
                level: zoomLevel,
                draggable: draggable,
            };

            // 맵 인스턴스 생성
            const newMap = new window.kakao.maps.Map(mapRef.current, mapOptions);
            mapInstance.current = newMap;
            setIsMapReady(true);

            console.log("카카오맵 초기화 완료");
        });
    }, [places, userLocation]); // places와 userLocation이 변경될 때마다 재초기화

    // 2. 마커 업데이트 Hook: places나 selectedPlace가 바뀔 때마다 실행
    useEffect(() => {
        if (!mapInstance.current || !window.kakao?.maps || !isMapReady) return;

        const map = mapInstance.current;
        const kakao = window.kakao;

        // 기존 마커 제거
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
        // 기존 폴리라인 제거
        if (polylineRef.current) {
            polylineRef.current.setMap(null);
            polylineRef.current = null;
        }

        const bounds = new kakao.maps.LatLngBounds();

        const geocoder = kakao.maps.services ? new kakao.maps.services.Geocoder() : null;

        const resolveLatLng = (place: any): Promise<any> => {
            return new Promise((resolve) => {
                // 주소가 있으면 주소 기준으로 우선 보정
                if (geocoder && place.address) {
                    geocoder.addressSearch(place.address, (result: any[], status: string) => {
                        if (status === kakao.maps.services.Status.OK && result[0]) {
                            const lat = Number(result[0].y);
                            const lng = Number(result[0].x);
                            return resolve(new kakao.maps.LatLng(lat, lng));
                        }
                        // 실패 시 기존 좌표 사용
                        resolve(new kakao.maps.LatLng(place.latitude, place.longitude));
                    });
                } else {
                    resolve(new kakao.maps.LatLng(place.latitude, place.longitude));
                }
            });
        };

        (async () => {
            // 기존 마커/라인 초기화는 위에서 수행됨
            const positions = await Promise.all(places.map((p) => resolveLatLng(p)));
            resolvedPositionsRef.current = {};

            // 마커 생성
            positions.forEach((position, idx) => {
                const place = places[idx];
                resolvedPositionsRef.current[place.id] = position;

                const marker = new kakao.maps.Marker({
                    position,
                    title: place.name,
                });
                marker.setMap(map);

                kakao.maps.event.addListener(marker, "click", () => {
                    onPlaceClick(place);
                });

                markersRef.current.push(marker);
                bounds.extend(position);
            });

            // 지도 범위 조정 (코스 장소들만 고려)
            if (places.length > 0) {
                if (places.length === 1) {
                    map.setCenter(positions[0]);
                    map.setLevel(2);
                } else {
                    map.setBounds(bounds);
                    const currentLevel = map.getLevel();
                    if (currentLevel > 4) map.setLevel(4);
                }
            }

            // 경로 그리기
            if (drawPath && places.length >= 2) {
                const sortedForPath = [...places].sort((a: any, b: any) => {
                    const aOrder = typeof a?.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
                    const bOrder = typeof b?.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
                    if (aOrder === bOrder) return 0;
                    return aOrder - bOrder;
                });

                // OSRM walking/foot 경로 시도 (보정된 좌표 사용)
                try {
                    const coords = sortedForPath.map((p) => {
                        const pos = resolvedPositionsRef.current[p.id];
                        return [pos.getLng(), pos.getLat()];
                    });
                    const coordStr = coords.map((c) => `${c[0]},${c[1]}`).join(";");
                    // 가까운 구간(총 거리 1km 미만)은 단순 직선 경로가 보기도 자연스럽고 오류가 적음
                    const toRad = (v: number) => (v * Math.PI) / 180;
                    const haversine = (lon1: number, lat1: number, lon2: number, lat2: number) => {
                        const R = 6371000;
                        const dLat = toRad(lat2 - lat1);
                        const dLon = toRad(lon2 - lon1);
                        const a =
                            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        return R * c;
                    };
                    let straightTotal = 0;
                    for (let i = 1; i < coords.length; i++) {
                        const [prevLon, prevLat] = coords[i - 1];
                        const [lon, lat] = coords[i];
                        straightTotal += haversine(prevLon, prevLat, lon, lat);
                    }
                    // simple 모드일 때만 직선 연결 사용. walking/driving은 항상 도로를 따라 라우팅
                    if (routeMode === "simple") {
                        const simplePath = coords.map(([lon, lat]) => new kakao.maps.LatLng(lat, lon));
                        const simpleLine = new kakao.maps.Polyline({
                            path: simplePath,
                            strokeWeight: 4,
                            strokeColor: "#60a5fa",
                            strokeOpacity: 0.9,
                            strokeStyle: "solid",
                        });
                        simpleLine.setMap(map);
                        polylineRef.current = simpleLine;
                        return;
                    }
                    // 골목 최단: foot 사용, 대안 경로 비활성화해서 한 개만 받기
                    let osrmUrl = `https://router.project-osrm.org/route/v1/foot/${coordStr}?alternatives=false&overview=full&geometries=geojson`;
                    const res = await fetch(osrmUrl, { cache: "no-store" });
                    const data = await res.json();
                    if (data?.routes?.[0]?.geometry?.coordinates) {
                        const geoCoords: [number, number][] = data.routes[0].geometry.coordinates;
                        const path = geoCoords.map(([lon, lat]) => new kakao.maps.LatLng(lat, lon));
                        const polyline = new kakao.maps.Polyline({
                            path,
                            strokeWeight: 4,
                            strokeColor: "#60a5fa", // 연한 파랑
                            strokeOpacity: 0.9,
                            strokeStyle: "solid",
                        });
                        polyline.setMap(map);
                        polylineRef.current = polyline;
                        return;
                    }
                    // 실패 시 walking으로 재시도(대체경로 비활성화)
                    const res2 = await fetch(
                        `https://router.project-osrm.org/route/v1/walking/${coordStr}?alternatives=false&overview=full&geometries=geojson`,
                        { cache: "no-store" }
                    );
                    const data2 = await res2.json();
                    if (data2?.routes?.[0]?.geometry?.coordinates) {
                        const geoCoords: [number, number][] = data2.routes[0].geometry.coordinates;
                        const path = geoCoords.map(([lon, lat]) => new kakao.maps.LatLng(lat, lon));
                        const polyline = new kakao.maps.Polyline({
                            path,
                            strokeWeight: 4,
                            strokeColor: "#60a5fa",
                            strokeOpacity: 0.9,
                            strokeStyle: "solid",
                        });
                        polyline.setMap(map);
                        polylineRef.current = polyline;
                        return;
                    }
                } catch {}

                // 실패 시 직선 연결 폴백 (도보 그린)
                const fallbackPath = sortedForPath.map((p) => {
                    const pos = resolvedPositionsRef.current[p.id];
                    return new kakao.maps.LatLng(pos.getLat(), pos.getLng());
                });
                const fallbackPolyline = new kakao.maps.Polyline({
                    path: fallbackPath,
                    strokeWeight: 4,
                    strokeColor: "#60a5fa",
                    strokeOpacity: 0.9,
                    strokeStyle: "solid",
                });
                fallbackPolyline.setMap(map);
                polylineRef.current = fallbackPolyline;
            }
        })();

        // 사용자 위치 마커는 제거 (코스 상세 페이지에서는 불필요)

        // 지도 범위 조정 (코스 장소들만 고려)
        if (places.length > 0) {
            if (places.length === 1) {
                // 장소가 하나면 해당 장소에 포커스
                const singlePlace = places[0];
                const position = new kakao.maps.LatLng(singlePlace.latitude, singlePlace.longitude);
                map.setCenter(position);
                map.setLevel(2); // 더 가까운 줌 레벨로 설정
                console.log(`단일 장소 포커스: ${singlePlace.name}`);
            } else {
                // 여러 장소가 있으면 모든 마커가 보이도록 조정
                map.setBounds(bounds);
                // 약간의 여백을 위해 줌 레벨 조정
                const currentLevel = map.getLevel();
                if (currentLevel > 4) {
                    map.setLevel(4);
                }
                console.log(`${places.length}개 장소 모두 표시`);
            }
        }

        // 이전 버전의 중복 경로 그리기 제거 (경로는 위 IIFE에서 한 번만 그립니다)
    }, [places, selectedPlace, userLocation, onPlaceClick, isMapReady]);

    // 선택된 장소가 바뀌면 해당 위치로 포커스 이동
    useEffect(() => {
        if (!mapInstance.current || !window.kakao?.maps || !selectedPlace) return;
        try {
            const map = mapInstance.current;
            const resolved = resolvedPositionsRef.current[selectedPlace.id];
            const center = resolved || new window.kakao.maps.LatLng(selectedPlace.latitude, selectedPlace.longitude);
            map.setCenter(center);
            // 살짝 확대
            const current = map.getLevel();
            if (current > 3) map.setLevel(3);
        } catch {}
    }, [selectedPlace]);

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (markersRef.current.length > 0) {
                markersRef.current.forEach((marker) => marker.setMap(null));
                markersRef.current = [];
            }
        };
    }, []);

    return (
        <div className={`relative ${className}`} style={style}>
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: "300px" }} />
            {/* window.kakao가 준비되지 않았을 때만 로딩 스피너 표시 */}
            {!window.kakao && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                    <LoadingSpinner />
                </div>
            )}
        </div>
    );
}
