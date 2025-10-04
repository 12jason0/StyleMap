"use client";

import { useEffect, useRef } from "react";
import type { MapProps, Place } from "@/types/map";

export default function NaverMapComponent({
    places,
    userLocation,
    selectedPlace,
    onPlaceClick,
    className = "",
    style = {},
    drawPath,
    routeMode = "walking", // 기본을 walking으로 고정
    center,
}: MapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const polylineRef = useRef<any>(null);
    const routeAbortRef = useRef<AbortController | null>(null);

    const isFiniteNum = (v: any) => Number.isFinite(Number(v));
    const isValidLatLng = (lat?: any, lng?: any) => isFiniteNum(lat) && isFiniteNum(lng);
    const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        try {
            const R = 6371e3;
            const toRad = (v: number) => (v * Math.PI) / 180;
            const dLat = toRad(lat2 - lat1);
            const dLng = toRad(lng2 - lng1);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        } catch {
            return Infinity;
        }
    };

    const pickCenter = (): { lat: number; lng: number } => {
        if (selectedPlace && isValidLatLng(selectedPlace.latitude, selectedPlace.longitude)) {
            return { lat: Number(selectedPlace.latitude), lng: Number(selectedPlace.longitude) };
        }
        const first = (places || []).find((p) => isValidLatLng(p?.latitude, p?.longitude));
        if (first) return { lat: Number(first.latitude), lng: Number(first.longitude) };
        if (userLocation && isValidLatLng(userLocation.lat, userLocation.lng)) {
            return { lat: Number(userLocation.lat), lng: Number(userLocation.lng) };
        }
        return { lat: 37.5665, lng: 126.978 };
    };

    // 네이버 지도 스크립트 로더
    const loadNaverMapsScript = (): Promise<void> => {
        return new Promise((resolve) => {
            if ((window as any).naver?.maps) return resolve();
            const anyExisting = Array.from(document.getElementsByTagName("script")).find((s) =>
                (s as HTMLScriptElement).src.includes("/openapi/v3/maps.js")
            ) as HTMLScriptElement | undefined;
            if (anyExisting) {
                anyExisting.addEventListener("load", () => resolve(), { once: true });
                if ((window as any).naver?.maps) resolve();
                return;
            }
            const clientId = (process as any).env?.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;
            const src = clientId
                ? `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${encodeURIComponent(
                      clientId
                  )}&submodules=geocoder`
                : `https://openapi.map.naver.com/openapi/v3/maps.js`;
            const script = document.createElement("script");
            script.id = "naver-maps-script";
            script.src = src;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            document.head.appendChild(script);
        });
    };

    // 지도 초기화
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!(window as any).naver?.maps) {
                await loadNaverMapsScript();
            }
            if (cancelled || !(window as any).naver?.maps || !containerRef.current) return;
            const naver = (window as any).naver;
            const c = center ?? pickCenter();
            mapRef.current = new naver.maps.Map(containerRef.current, {
                center: new naver.maps.LatLng(c.lat, c.lng),
                zoom: 15,
            });
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // 마커 + 경로
    useEffect(() => {
        const naver = (window as any).naver;
        if (!naver?.maps || !mapRef.current) return;

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        if (polylineRef.current) {
            try {
                polylineRef.current.setMap(null);
            } catch {}
            polylineRef.current = null;
        }

        const map = mapRef.current;
        const bounds = new naver.maps.LatLngBounds();
        let didExtend = false;

        // 사용자 위치
        let userPos: any = null;
        if (userLocation && isValidLatLng(userLocation.lat, userLocation.lng)) {
            userPos = new naver.maps.LatLng(Number(userLocation.lat), Number(userLocation.lng));
            const me = new naver.maps.Marker({ position: userPos, map, zIndex: 20, title: "현재 위치" });
            markersRef.current.push(me);
            bounds.extend(userPos);
            didExtend = true;
        }

        // 장소 마커
        const valid: Place[] = (places || []).filter((p) => isValidLatLng(p?.latitude, p?.longitude)) as Place[];
        valid.forEach((p) => {
            const pos = new naver.maps.LatLng(Number(p.latitude), Number(p.longitude));
            const marker = new naver.maps.Marker({ position: pos, map, title: p.name });
            naver.maps.Event.addListener(marker, "click", () => onPlaceClick(p));
            markersRef.current.push(marker);
            bounds.extend(pos);
            didExtend = true;
        });

        if (didExtend) {
            map.fitBounds(bounds);
        }

        // 경로 그리기
        const buildRoute = async () => {
            if (!drawPath) return;
            const mode = routeMode === "driving" ? "driving" : "walking";
            const isDriving = mode === "driving";

            // ✅ Case 1: start 페이지 (현재 위치 + 장소 1개) - 도로(운전) 경로만 사용
            if (userPos && valid.length === 1) {
                const uLng = Number(userLocation?.lng ?? 0);
                const uLat = Number(userLocation?.lat ?? 0);
                const dist = distanceMeters(uLat, uLng, Number(valid[0].latitude), Number(valid[0].longitude));
                const tooFar = isDriving ? dist > 50_000 : dist > 5_000;
                if (tooFar) {
                    return; // 너무 멀면 지도 상 경로 생략 (건물 관통 방지)
                }
                const fetchDrivingPath = async () => {
                    const coords = `${uLng},${uLat};${valid[0].longitude},${valid[0].latitude}`;
                    const res = await fetch(`/api/directions?coords=${encodeURIComponent(coords)}&mode=driving`);
                    if (!res.ok) return null as any[] | null;
                    const data = await res.json();
                    return Array.isArray(data?.coordinates) && data.coordinates.length > 0 ? data.coordinates : null;
                };
                try {
                    const coordsPath = await fetchDrivingPath();
                    if (!coordsPath) return; // 끝까지 실패하면 라인 미표시
                    const latlngs = coordsPath.map(([lng, lat]: [number, number]) => new naver.maps.LatLng(lat, lng));
                    polylineRef.current = new naver.maps.Polyline({
                        map,
                        path: latlngs,
                        strokeWeight: 4,
                        strokeColor: "#1D4ED8", // blue-700
                        strokeOpacity: 0.9,
                    });
                } catch {}
                return;
            }

            // ✅ Case 2: courses/[id] (장소 여러 개 연결)
            if (valid.length >= 2) {
                const allLatLngs: any[] = [];
                const tryFetchSegment = async (
                    start: { latitude: number; longitude: number },
                    end: { latitude: number; longitude: number },
                    primary: "walking" | "driving"
                ): Promise<Array<[number, number]> | null> => {
                    const coords = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
                    try {
                        // 1차도보/운전 시도
                        const r1 = await fetch(`/api/directions?coords=${encodeURIComponent(coords)}&mode=${primary}`);
                        if (r1.ok) {
                            const d1 = await r1.json();
                            if (Array.isArray(d1?.coordinates) && d1.coordinates.length > 0) return d1.coordinates;
                        }
                        // 2차 반대 모드 재시도
                        const secondary = primary === "walking" ? "driving" : "walking";
                        const r2 = await fetch(
                            `/api/directions?coords=${encodeURIComponent(coords)}&mode=${secondary}`
                        );
                        if (r2.ok) {
                            const d2 = await r2.json();
                            if (Array.isArray(d2?.coordinates) && d2.coordinates.length > 0) return d2.coordinates;
                        }
                    } catch {}
                    return null;
                };

                for (let i = 0; i < valid.length - 1; i++) {
                    const a = valid[i];
                    const b = valid[i + 1];
                    const d = distanceMeters(a.latitude, a.longitude, b.latitude, b.longitude);
                    // 1.5km 이하는 보행 우선, 그 외는 운전 우선
                    const primary: "walking" | "driving" = d <= 1_500 ? "walking" : "driving";
                    const coordsPath = await tryFetchSegment(a as any, b as any, primary);
                    if (coordsPath && coordsPath.length > 0) {
                        let segment = coordsPath.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));
                        if (allLatLngs.length > 0) segment.shift();
                        allLatLngs.push(...segment);
                    }
                }

                if (allLatLngs.length > 1) {
                    polylineRef.current = new naver.maps.Polyline({
                        map,
                        path: allLatLngs,
                        strokeWeight: 4,
                        strokeColor: "#1D4ED8", // blue-700
                        strokeOpacity: 0.9,
                    });
                }
                // 경로가 전혀 없으면 마커를 잇는 보정선(연한 파랑, 점선) 표시 옵션
                else if (valid.length >= 2) {
                    const fallback = valid.map((p) => new naver.maps.LatLng(Number(p.latitude), Number(p.longitude)));
                    polylineRef.current = new naver.maps.Polyline({
                        map,
                        path: fallback,
                        strokeWeight: 3,
                        strokeColor: "#60A5FA", // blue-400
                        strokeOpacity: 0.8,
                    });
                }
            }
        };

        buildRoute();
    }, [places, userLocation, selectedPlace, drawPath, routeMode]);

    return <div ref={containerRef} className={className} style={{ ...style, width: "100%", height: "100%" }} />;
}
