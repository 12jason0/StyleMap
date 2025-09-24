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
}: MapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const polylineRef = useRef<any>(null);

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

    // 스크립트 준비 대기 + 지도 초기화
    useEffect(() => {
        let cancelled = false;
        const ensure = () =>
            new Promise<void>((resolve) => {
                if ((window as any).naver?.maps) return resolve();
                let tries = 0;
                const t = setInterval(() => {
                    if ((window as any).naver?.maps || cancelled) {
                        clearInterval(t);
                        resolve();
                    } else if (++tries > 100) {
                        clearInterval(t);
                        resolve();
                    }
                }, 50);
            });

        (async () => {
            await ensure();
            if (cancelled || !(window as any).naver?.maps || !containerRef.current) return;
            const naver = (window as any).naver;
            const c = pickCenter();
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

        // 장소들
        const valid: Place[] = (places || []).filter((p) => isValidLatLng(p?.latitude, p?.longitude)) as Place[];
        valid.forEach((p) => {
            const pos = new naver.maps.LatLng(Number(p.latitude), Number(p.longitude));
            const marker = new naver.maps.Marker({ position: pos, map, title: p.name });
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

        // 간단 경로(옵션)
        if (drawPath && valid.length >= 2) {
            const path = valid.map((p) => new naver.maps.LatLng(Number(p.latitude), Number(p.longitude)));
            polylineRef.current = new naver.maps.Polyline({ map, path, strokeWeight: 4, strokeColor: "#10b981" });
        }
    }, [places, userLocation, selectedPlace, drawPath, onPlaceClick]);

    return <div ref={containerRef} className={className} style={{ ...style, width: "100%", height: "100%" }} />;
}
