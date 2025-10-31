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
    const routeCacheRef = useRef<Map<string, Array<[number, number]>>>(new Map());
    const prevRouteKeyRef = useRef<string | null>(null);

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

    // 마커 콘텐츠 생성기 (선택 상태와 순서 배지 표시)
    const createMarkerContent = (orderIndex?: number, isSelected: boolean = false): string => {
        const size = isSelected ? 40 : 32;
        const fontSize = isSelected ? 16 : 12;
        const borderWidth = isSelected ? 3 : 2;
        const bgColor = isSelected ? "var(--brand-green-dark, #0F766E)" : "var(--brand-green, #10B981)";
        const zIndex = isSelected ? 1000 : 1;

        return `
            <div style="
                position: relative;
                width: ${size}px;
                height: ${size}px;
                z-index: ${zIndex};
            ">
                <div style="
                    position: relative;
                    background: ${bgColor};
                    color: white;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: ${fontSize}px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    border: ${borderWidth}px solid white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                ">
                    ${orderIndex || "📍"}
                </div>
            </div>
        `;
    };

    // (애니메이션 제거)

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

            // ✅ 신규 Maps 방식
            const clientId =
                typeof process !== "undefined"
                    ? process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
                    : (window as any).__NEXT_PUBLIC_NAVER_MAP_CLIENT_ID__;

            const src = clientId
                ? `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
                      clientId
                  )}&submodules=geocoder`
                : `https://oapi.map.naver.com/openapi/v3/maps.js`;

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

        console.log("=== NaverMap 렌더링 시작 ===");
        console.log("📦 Props 확인:");
        console.log("  - drawPath:", drawPath);
        console.log("  - userLocation:", userLocation);
        console.log("  - places:", places);
        console.log("  - selectedPlace:", selectedPlace);

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

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
            console.log("✅ 사용자 마커 생성:", {
                lat: userLocation.lat,
                lng: userLocation.lng,
            });
        }

        // 장소 마커
        const valid: Place[] = (places || []).filter((p) => isValidLatLng(p?.latitude, p?.longitude)) as Place[];
        console.log("📍 유효한 장소:", valid.length, "개");

        valid.forEach((p, idx) => {
            const pos = new naver.maps.LatLng(Number(p.latitude), Number(p.longitude));
            const isSelected = selectedPlace?.id === p.id;
            const orderIndex = (p as any).orderIndex ?? idx + 1;

            const marker = new naver.maps.Marker({
                position: pos,
                map,
                title: p.name,
                icon: {
                    content: createMarkerContent(orderIndex, isSelected),
                    anchor: new naver.maps.Point(isSelected ? 20 : 16, isSelected ? 20 : 16),
                },
                zIndex: isSelected ? 1000 : 100,
            });

            naver.maps.Event.addListener(marker, "click", () => {
                onPlaceClick(p);
                if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                    try {
                        (navigator as any).vibrate?.(50);
                    } catch {}
                }
            });

            markersRef.current.push(marker);
            bounds.extend(pos);
            didExtend = true;
            console.log(`  [${orderIndex}] ${p.name}:`, {
                lat: p.latitude,
                lng: p.longitude,
                selected: isSelected,
            });
        });

        if (didExtend) {
            map.fitBounds(bounds);
        }

        // 경로 그리기
        // 선택만 바뀐 경우에는 경로 재계산을 건너뜀
        const placesKey = valid
            .map((p) => `${Number(p.latitude).toFixed(6)},${Number(p.longitude).toFixed(6)}`)
            .join("|");
        const userKey = userPos
            ? `${Number(userLocation!.lat).toFixed(6)},${Number(userLocation!.lng).toFixed(6)}`
            : "";
        const currentRouteKey = `${placesKey}__${userKey}`;
        const routeUnchanged = prevRouteKeyRef.current === currentRouteKey;
        prevRouteKeyRef.current = currentRouteKey;

        const buildRoute = async () => {
            if (routeUnchanged) {
                console.log("⏭ 경로 키 변경 없음 - 재계산 건너뜀");
                return;
            }
            if (!drawPath) {
                console.log("⚠️ drawPath가 false - 경로 그리기 건너뜀");
                return;
            }

            console.log("🚀 경로 그리기 시작");

            // ✅ Case 1: start 페이지 (현재 위치 + 장소 1개)
            if (userPos && valid.length === 1) {
                const uLng = Number(userLocation?.lng ?? 0);
                const uLat = Number(userLocation?.lat ?? 0);

                console.log("📍 Case 1: 사용자 위치 → 장소 1개");
                console.log("  출발:", { lat: uLat, lng: uLng });
                console.log("  도착:", { name: valid[0].name, lat: valid[0].latitude, lng: valid[0].longitude });

                // 🔴 같은 좌표 체크
                if (Math.abs(uLat - valid[0].latitude) < 0.00001 && Math.abs(uLng - valid[0].longitude) < 0.00001) {
                    console.error("❌ 출발지와 도착지가 동일합니다!");
                    return;
                }

                const fetchPath = async () => {
                    const coords = `${uLng},${uLat};${valid[0].longitude},${valid[0].latitude}`;
                    console.log("🌐 API 요청 좌표:", coords);
                    const samplePath = (path: Array<[number, number]>, maxPoints = 200): Array<[number, number]> => {
                        if (!Array.isArray(path) || path.length <= maxPoints) return path;
                        const step = Math.ceil(path.length / maxPoints);
                        const out: Array<[number, number]> = [];
                        for (let i = 0; i < path.length; i += step) out.push(path[i]);
                        const last = path[path.length - 1];
                        const tail = out[out.length - 1];
                        if (!tail || tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
                        return out;
                    };

                    // 도보 우선 시도
                    try {
                        const ck = `walking:${coords}`;
                        const cached = routeCacheRef.current.get(ck);
                        if (cached) return cached;
                        const url = `/api/directions?coords=${encodeURIComponent(coords)}&mode=walking`;
                        const res1 = await fetch(url, { cache: "no-store" });
                        if (res1.ok) {
                            const data = await res1.json();
                            console.log("🚶 도보 응답:", data);
                            if (Array.isArray(data?.coordinates) && data.coordinates.length > 0) {
                                const simplified = samplePath(data.coordinates);
                                routeCacheRef.current.set(ck, simplified);
                                return simplified;
                            }
                        }
                    } catch (error) {
                        console.error("도보 경로 요청 실패:", error);
                    }

                    // 도보 실패 시 운전 경로 시도
                    try {
                        const ck = `driving:${coords}`;
                        const cached = routeCacheRef.current.get(ck);
                        if (cached) return cached;
                        const url = `/api/directions?coords=${encodeURIComponent(coords)}&mode=driving`;
                        const res2 = await fetch(url, { cache: "no-store" });
                        if (res2.ok) {
                            const data = await res2.json();
                            console.log("🚗 운전 응답:", data);
                            if (Array.isArray(data?.coordinates) && data.coordinates.length > 0) {
                                const simplified = samplePath(data.coordinates);
                                routeCacheRef.current.set(ck, simplified);
                                return simplified;
                            }
                        }
                    } catch (error) {
                        console.error("운전 경로 요청 실패:", error);
                    }

                    return null;
                };

                try {
                    const coordsPath = await fetchPath();

                    if (coordsPath && coordsPath.length > 0) {
                        const latlngs = coordsPath.map(
                            ([lng, lat]: [number, number]) => new naver.maps.LatLng(lat, lng)
                        );

                        console.log("✅ Polyline 생성:", latlngs.length, "개 포인트");
                        polylineRef.current = new naver.maps.Polyline({
                            map,
                            path: latlngs,
                            strokeWeight: 4,
                            strokeColor: "var(--brand-green, #10B981)",
                            strokeOpacity: 0.9,
                        });
                    } else {
                        console.warn("⚠️ 경로 데이터가 없습니다");
                    }
                } catch (error) {
                    console.error("❌ 경로 생성 중 에러:", error);
                }
                return;
            }

            // ✅ Case 2: courses/[id] (장소 여러 개 연결)
            if (valid.length >= 2) {
                console.log("📍 Case 2: 장소 여러 개 연결", valid.length);
                const allLatLngs: any[] = [];

                const tryFetchSegment = async (
                    start: { latitude: number; longitude: number },
                    end: { latitude: number; longitude: number },
                    primary: "walking" | "driving"
                ): Promise<Array<[number, number]> | null> => {
                    const coords = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
                    console.log(`🌐 세그먼트 요청 (${primary}):`, coords);
                    const samplePath = (path: Array<[number, number]>, maxPoints = 200): Array<[number, number]> => {
                        if (!Array.isArray(path) || path.length <= maxPoints) return path;
                        const step = Math.ceil(path.length / maxPoints);
                        const out: Array<[number, number]> = [];
                        for (let i = 0; i < path.length; i += step) out.push(path[i]);
                        const last = path[path.length - 1];
                        const tail = out[out.length - 1];
                        if (!tail || tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
                        return out;
                    };
                    try {
                        const ck1 = `${primary}:${coords}`;
                        const cached1 = routeCacheRef.current.get(ck1);
                        if (cached1) return cached1;
                        const r1 = await fetch(`/api/directions?coords=${encodeURIComponent(coords)}&mode=${primary}`, {
                            cache: "no-store",
                        });
                        if (r1.ok) {
                            const d1 = await r1.json();
                            if (Array.isArray(d1?.coordinates) && d1.coordinates.length > 0) {
                                const simplified = samplePath(d1.coordinates);
                                routeCacheRef.current.set(ck1, simplified);
                                console.log(`✅ ${primary} 경로 성공:`, simplified.length, "포인트");
                                return simplified;
                            }
                        }

                        const secondary = primary === "walking" ? "driving" : "walking";
                        const ck2 = `${secondary}:${coords}`;
                        const cached2 = routeCacheRef.current.get(ck2);
                        if (cached2) return cached2;
                        const r2 = await fetch(
                            `/api/directions?coords=${encodeURIComponent(coords)}&mode=${secondary}`,
                            { cache: "no-store" }
                        );
                        if (r2.ok) {
                            const d2 = await r2.json();
                            if (Array.isArray(d2?.coordinates) && d2.coordinates.length > 0) {
                                const simplified = samplePath(d2.coordinates);
                                routeCacheRef.current.set(ck2, simplified);
                                console.log(`✅ ${secondary} 경로 성공:`, simplified.length, "포인트");
                                return simplified;
                            }
                        }
                    } catch (error) {
                        console.error("세그먼트 요청 실패:", error);
                    }
                    return null;
                };

                // 병렬로 모든 세그먼트 요청
                const tasks: Array<Promise<Array<[number, number]> | null>> = [];
                for (let i = 0; i < valid.length - 1; i++) {
                    const a = valid[i];
                    const b = valid[i + 1];
                    const d = distanceMeters(a.latitude, a.longitude, b.latitude, b.longitude);
                    const primary: "walking" | "driving" = d <= 1_500 ? "walking" : "driving";
                    console.log(`🔗 세그먼트 ${i}:`, a.name, "→", b.name, `(${d.toFixed(0)}m, ${primary})`);
                    tasks.push(tryFetchSegment(a as any, b as any, primary));
                }
                const results = await Promise.all(tasks);
                results.forEach((coordsPath, idx) => {
                    if (coordsPath && coordsPath.length > 0) {
                        let segment = coordsPath.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));
                        if (allLatLngs.length > 0) segment.shift();
                        allLatLngs.push(...segment);
                    }
                });

                console.log("📊 전체 경로 포인트:", allLatLngs.length);
                if (allLatLngs.length > 1) {
                    polylineRef.current = new naver.maps.Polyline({
                        map,
                        path: allLatLngs,
                        strokeWeight: 4,
                        strokeColor: "var(--brand-green, #10B981)",
                        strokeOpacity: 0.9,
                    });
                    console.log("✅ Polyline 생성 완료");
                } else {
                    console.warn("⚠️ 경로 포인트가 부족합니다");
                }
            }
        };

        buildRoute().catch((error) => {
            console.error("❌ buildRoute 에러:", error);
        });
    }, [places, userLocation, selectedPlace, drawPath, routeMode]);

    // 선택된 장소로 부드럽게 이동
    useEffect(() => {
        const naver = (window as any).naver;
        if (!naver?.maps || !mapRef.current || !selectedPlace) return;
        if (!isValidLatLng(selectedPlace.latitude, selectedPlace.longitude)) return;

        const targetPos = new naver.maps.LatLng(Number(selectedPlace.latitude), Number(selectedPlace.longitude));
        try {
            mapRef.current.panTo(targetPos, { duration: 500, easing: "easeOutCubic" });
            console.log("🗺️ 지도 중심 이동:", selectedPlace.name);
        } catch {}
    }, [selectedPlace]);

    return <div ref={containerRef} className={className} style={{ ...style, width: "100%", height: "100%" }} />;
}
