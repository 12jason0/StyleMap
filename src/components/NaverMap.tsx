"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MapProps, Place } from "@/types/map";

export default function NaverMapComponent({
    places,
    userLocation,
    selectedPlace,
    onPlaceClick,
    className = "",
    style = {},
    drawPath,
    routeMode = "simple",
    center,
}: MapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const polylineRef = useRef<any>(null);
    const routeAbortRef = useRef<AbortController | null>(null);

    const isFiniteNum = (v: any) => Number.isFinite(Number(v));
    const isValidLatLng = (lat?: any, lng?: any) => isFiniteNum(lat) && isFiniteNum(lng);

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
            // RootLayout 등에서 미리 삽입된 스크립트가 있다면 그것을 기다림
            const anyExisting = Array.from(document.getElementsByTagName("script")).find((s) =>
                (s as HTMLScriptElement).src.includes("/openapi/v3/maps.js")
            ) as HTMLScriptElement | undefined;
            if (anyExisting) {
                anyExisting.addEventListener("load", () => resolve(), { once: true });
                if ((window as any).naver?.maps) resolve();
                return;
            }
            const existing = document.getElementById("naver-maps-script") as HTMLScriptElement | null;
            if (existing) {
                existing.addEventListener("load", () => resolve(), { once: true });
                // 혹시 이미 로드된 경우 대비
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

    // 스크립트 준비 대기 + 지도 초기화
    useEffect(() => {
        let cancelled = false;
        const ensure = async () => {
            if (!(window as any).naver?.maps) {
                await loadNaverMapsScript();
            }
        };

        (async () => {
            await ensure();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 마커/경로 업데이트
    useEffect(() => {
        const naver = (window as any).naver;
        if (!naver?.maps || !mapRef.current) return;

        // 정리
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

        // 사용자 위치
        if (userLocation && isValidLatLng(userLocation.lat, userLocation.lng)) {
            const pos = new naver.maps.LatLng(Number(userLocation.lat), Number(userLocation.lng));
            const me = new naver.maps.Marker({ position: pos, map, zIndex: 20, title: "현재 위치" });
            markersRef.current.push(me);
            bounds.extend(pos);
        }

        // 아이콘 팩토리
        const getMarkerIcon = (category?: string) => {
            try {
                const isCafe = typeof category === "string" && category.includes("카페");
                const isFood =
                    typeof category === "string" &&
                    (category.includes("음식") || category.includes("맛집") || category.includes("식당"));
                const url = isCafe ? "/images/cafeMaker.png" : isFood ? "/images/maker1.png" : undefined;
                if (!url) return undefined;
                return {
                    url,
                    size: new naver.maps.Size(24, 37),
                    anchor: new naver.maps.Point(12, 37),
                } as any;
            } catch {
                return undefined;
            }
        };

        // 장소들
        const valid: Place[] = (places || []).filter((p) => isValidLatLng(p?.latitude, p?.longitude)) as Place[];
        valid.forEach((p) => {
            const pos = new naver.maps.LatLng(Number(p.latitude), Number(p.longitude));
            const marker = new naver.maps.Marker({
                position: pos,
                map,
                title: p.name,
                icon: getMarkerIcon((p as any).category),
            });
            naver.maps.Event.addListener(marker, "click", () => onPlaceClick(p));
            markersRef.current.push(marker);
            bounds.extend(pos);
        });

        // 중심/경계
        try {
            if (valid.length === 1 && !userLocation) {
                map.setCenter(new naver.maps.LatLng(Number(valid[0].latitude), Number(valid[0].longitude)));
                map.setZoom(15);
            } else if (!bounds.isEmpty()) {
                map.fitBounds(bounds);
            }
        } catch {}

        // 경로(옵션)
        const buildRoute = async () => {
            if (!drawPath || valid.length < 2) return;
            // 1) 즉시 직선 경로 먼저 표시 (체감 개선)
            const simplePath = valid.map((p) => new naver.maps.LatLng(Number(p.latitude), Number(p.longitude)));
            const simplePolyline = new naver.maps.Polyline({
                map,
                path: simplePath,
                strokeWeight: 4,
                strokeColor: "#111827",
                strokeOpacity: 0.6,
            });
            polylineRef.current = simplePolyline;

            // simple 모드면 종료
            if (!routeMode || routeMode === "simple") return;

            // 2) 네트워크 경로를 비동기 계산, 2초 타임아웃/취소
            try {
                if (routeAbortRef.current) routeAbortRef.current.abort();
                const aborter = new AbortController();
                routeAbortRef.current = aborter;
                const { signal } = aborter;
                const timeoutId = setTimeout(() => aborter.abort(), 2000);

                const allLatLngs: any[] = [];
                for (let i = 0; i < valid.length - 1; i++) {
                    const a = valid[i];
                    const b = valid[i + 1];
                    const coords = `${a.longitude},${a.latitude};${b.longitude},${b.latitude}`;
                    let pairLatLngs: any[] | null = null;
                    try {
                        const res = await fetch(
                            `/api/directions?coords=${encodeURIComponent(coords)}&mode=${encodeURIComponent(
                                routeMode
                            )}`,
                            { cache: "no-store", signal }
                        );
                        if (res.ok) {
                            const data = await res.json();
                            const coordinates: Array<[number, number]> = Array.isArray(data?.coordinates)
                                ? data.coordinates
                                : [];
                            if (coordinates.length > 1) {
                                pairLatLngs = coordinates.map(
                                    ([lng, lat]) => new naver.maps.LatLng(Number(lat), Number(lng))
                                );
                            }
                        }
                    } catch {}

                    if (pairLatLngs && pairLatLngs.length > 1) {
                        if (allLatLngs.length > 0) pairLatLngs.shift();
                        allLatLngs.push(...pairLatLngs);
                    } else {
                        const straight = [
                            new naver.maps.LatLng(Number(a.latitude), Number(a.longitude)),
                            new naver.maps.LatLng(Number(b.latitude), Number(b.longitude)),
                        ];
                        if (allLatLngs.length > 0) straight.shift();
                        allLatLngs.push(...straight);
                    }
                }

                clearTimeout(timeoutId);
                if (!signal.aborted && allLatLngs.length > 1) {
                    try {
                        simplePolyline.setMap(null);
                    } catch {}
                    polylineRef.current = new naver.maps.Polyline({
                        map,
                        path: allLatLngs,
                        strokeWeight: 5,
                        strokeColor: "#4169E1",
                        strokeOpacity: 0.9,
                    });
                }
            } finally {
                routeAbortRef.current = null;
            }
        };

        buildRoute();
    }, [places, userLocation, selectedPlace, drawPath, onPlaceClick, routeMode]);

    return <div ref={containerRef} className={className} style={{ ...style, width: "100%", height: "100%" }} />;
}
