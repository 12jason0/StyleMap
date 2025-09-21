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
    ancientStyle = false,
    highlightPlaceId,
}: KakaoMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const polylineRef = useRef<any>(null);
    const resolvedPositionsRef = useRef<Record<number, any>>({});
    const tooltipOverlaysRef = useRef<Record<number, any>>({});
    const glowOverlayRef = useRef<any>(null);
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
            try {
                // 드래그/줌 인터랙션을 명시적으로 활성화
                newMap.setDraggable(!!draggable);
                newMap.setZoomable(true);
                const zoomControl = new window.kakao.maps.ZoomControl();
                newMap.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
            } catch {}
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
        // 기존 툴팁/글로우 제거
        Object.values(tooltipOverlaysRef.current).forEach((ov) => {
            try {
                ov.setMap(null);
            } catch {}
        });
        tooltipOverlaysRef.current = {};
        if (glowOverlayRef.current) {
            try {
                glowOverlayRef.current.setMap(null);
            } catch {}
            glowOverlayRef.current = null;
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

                let markerOptions: any = { position, title: place.name };
                if (ancientStyle || place.iconUrl) {
                    const iconSrc = place.iconUrl || "/images/rune-marker.png";
                    const size = new kakao.maps.Size(28, 28);
                    const offset = new kakao.maps.Point(14, 28);
                    markerOptions.image = new kakao.maps.MarkerImage(iconSrc, size, { offset });
                }
                const marker = new kakao.maps.Marker(markerOptions);
                marker.setMap(map);

                kakao.maps.event.addListener(marker, "click", () => {
                    onPlaceClick(place);
                    try {
                        // 즉시 해당 핀으로 부드럽게 이동 및 살짝 확대
                        map.panTo(position);
                        const cur = map.getLevel();
                        if (cur > 3) map.setLevel(3);
                    } catch {}
                });

                // Ancient tooltip overlay (hover)
                if (ancientStyle) {
                    const tooltipContent = document.createElement("div");
                    tooltipContent.innerHTML = `
                        <style>
                          @keyframes pulseGlow { 0%{opacity:.45; transform:scale(0.96);} 50%{opacity:.9; transform:scale(1);} 100%{opacity:.45; transform:scale(0.96);} }
                        </style>
                        <div style="padding:6px 10px;border:1px solid rgba(124,45,18,.7);border-radius:8px;background:rgba(250, 245, 229, .92);box-shadow:0 2px 6px rgba(0,0,0,.25);backdrop-filter:blur(1px);white-space:nowrap;font-size:12px;color:#3f2d20;">
                          ${place.name}
                        </div>`;
                    const tooltip = new kakao.maps.CustomOverlay({
                        position,
                        content: tooltipContent,
                        yAnchor: 1.6,
                        zIndex: 4,
                    });
                    tooltipOverlaysRef.current[place.id] = tooltip;
                    // hover handlers
                    kakao.maps.event.addListener(marker, "mouseover", () => {
                        try {
                            tooltip.setMap(map);
                        } catch {}
                    });
                    kakao.maps.event.addListener(marker, "mouseout", () => {
                        try {
                            tooltip.setMap(null);
                        } catch {}
                    });
                }

                markersRef.current.push(marker);
                bounds.extend(position);
            });

            // 지도 범위/중심 조정
            if (places.length > 0) {
                if (!selectedPlace) {
                    // 최초에는 전체 보기
                    if (places.length === 1) {
                        map.setCenter(positions[0]);
                        map.setLevel(2);
                    } else {
                        map.setBounds(bounds);
                    }
                } else {
                    const pos = resolvedPositionsRef.current[selectedPlace.id] || positions[0];
                    map.setCenter(pos);
                    map.setLevel(3);
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

                try {
                    const coords = sortedForPath.map((p) => {
                        const pos = resolvedPositionsRef.current[p.id];
                        return [pos.getLng(), pos.getLat()];
                    });
                    const coordStr = coords.map((c) => `${c[0]},${c[1]}`).join(";");
                    if (routeMode === "simple") {
                        const simplePath = coords.map(([lon, lat]) => new kakao.maps.LatLng(lat, lon));
                        const simpleLine = new kakao.maps.Polyline({
                            path: simplePath,
                            strokeWeight: 3,
                            strokeColor: ancientStyle ? "#b45309" : "#60a5fa",
                            strokeOpacity: 0.9,
                            strokeStyle: ancientStyle ? "shortdash" : "solid",
                        });
                        simpleLine.setMap(map);
                        polylineRef.current = simpleLine;
                        return;
                    }
                    const modeParam =
                        routeMode === "walking" || routeMode === "foot"
                            ? "walking"
                            : routeMode === "simple"
                            ? "walking"
                            : "driving";
                    const res = await fetch(
                        `/api/directions?coords=${encodeURIComponent(coordStr)}&mode=${modeParam}`,
                        {
                            cache: "no-store",
                        }
                    );
                    const data = await res.json();
                    if (data?.success && Array.isArray(data.coordinates)) {
                        const path = data.coordinates.map(
                            ([lon, lat]: [number, number]) => new kakao.maps.LatLng(lat, lon)
                        );
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

            // Highlight glow for current/target place
            if (ancientStyle && (highlightPlaceId || selectedPlace)) {
                const pid = highlightPlaceId || selectedPlace?.id;
                const pos = pid ? resolvedPositionsRef.current[pid] : null;
                if (pos) {
                    const glow = document.createElement("div");
                    glow.innerHTML = `
                      <style>
                        @keyframes runeGlow { 0%{opacity:.35; transform:scale(.9);} 50%{opacity:.9; transform:scale(1);} 100%{opacity:.35; transform:scale(.9);} }
                      </style>
                      <div style="width:64px;height:64px;border-radius:50%;
                          background:radial-gradient(closest-side, rgba(245, 158, 11,.55), rgba(245, 158, 11,.0) 70%);
                          filter:blur(0.5px); animation:runeGlow 2s ease-in-out infinite; transform:translate(-50%,-50%);
                          position:relative;">
                      </div>`;
                    const overlay = new kakao.maps.CustomOverlay({
                        position: pos,
                        content: glow,
                        zIndex: 3,
                        yAnchor: 0.5,
                        xAnchor: 0.5,
                    });
                    overlay.setMap(map);
                    glowOverlayRef.current = overlay;
                }
            }
        })();

        // 사용자 위치 마커는 제거 (코스 상세 페이지에서는 불필요)

        // 지도 범위 조정 (코스 장소들만 고려)
        if (places.length > 0) {
            if (selectedPlace) {
                const pos = resolvedPositionsRef.current[selectedPlace.id];
                if (pos) {
                    map.setCenter(pos);
                    map.setLevel(3);
                }
            } else if (places.length === 1) {
                const singlePlace = places[0];
                const position = new kakao.maps.LatLng(singlePlace.latitude, singlePlace.longitude);
                map.setCenter(position);
                map.setLevel(2);
            } else {
                map.setBounds(bounds);
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
            // 부드럽게 이동 + 적당히 확대
            map.panTo(center);
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
        <div className={`relative ${className}`} style={{ ...style, width: "100%", height: "100%" }}>
            {/* 경로 API 경고 배너 (프로덕션 주의) */}
            {/* 안내 배너 제거 요청에 따라 출력하지 않습니다. */}
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: "300px" }} />
            {ancientStyle && (
                <div
                    className="pointer-events-none absolute inset-0 rounded-2xl mix-blend-multiply opacity-80"
                    style={{
                        backgroundImage: "url(/images/parchment-frame.png)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
            )}
            {/* window.kakao가 준비되지 않았을 때만 로딩 스피너 표시 */}
            {!window.kakao && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                    <LoadingSpinner />
                </div>
            )}
        </div>
    );
}
