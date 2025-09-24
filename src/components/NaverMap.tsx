"use client";

import { useEffect, useRef, useState } from "react";
import type { MapProps, Place } from "@/types/map";

declare global {
    interface Window {
        naver: any;
    }
}

const Loading = () => (
    <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        <span className="ml-3 text-gray-600">지도 로딩 중...</span>
    </div>
);

export default function NaverMap({
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
}: MapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const [ready, setReady] = useState(false);
    const markersRef = useRef<any[]>([]);
    const pathRef = useRef<any>(null);

    const isFiniteNum = (v: any) => Number.isFinite(Number(v));
    const isValidLatLng = (lat?: any, lng?: any) => isFiniteNum(lat) && isFiniteNum(lng);

    // 지도 초기화
    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;
        if (!window.naver?.maps) return;

        const first = places.find((p) => isValidLatLng(p.latitude, p.longitude));
        const center = first
            ? new window.naver.maps.LatLng(Number(first.latitude), Number(first.longitude))
            : userLocation && isValidLatLng(userLocation.lat, userLocation.lng)
            ? new window.naver.maps.LatLng(Number(userLocation.lat), Number(userLocation.lng))
            : new window.naver.maps.LatLng(37.5665, 126.978);

        const map = new window.naver.maps.Map(mapRef.current, {
            center,
            zoom: places.length <= 1 ? 15 : 12,
            draggable,
            minZoom: 5,
            scaleControl: true,
            logoControl: false,
            mapDataControl: false,
        });
        mapInstance.current = map;
        setReady(true);
    }, [places, userLocation, draggable]);

    // 마커 및 경로 업데이트
    useEffect(() => {
        if (!ready || !mapInstance.current || !window.naver?.maps) return;
        const map = mapInstance.current;
        const naver = window.naver;

        // 기존 마커 제거
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        if (pathRef.current) {
            pathRef.current.setMap(null);
            pathRef.current = null;
        }

        const bounds = new naver.maps.LatLngBounds();

        const addMarker = (place: Place) => {
            const position = new naver.maps.LatLng(place.latitude, place.longitude);
            const marker = new naver.maps.Marker({ position, map, title: place.name, zIndex: 10 });
            naver.maps.Event.addListener(marker, "click", () => onPlaceClick(place));
            markersRef.current.push(marker);
            bounds.extend(position);
        };

        places.filter((p) => isValidLatLng(p.latitude, p.longitude)).forEach(addMarker);

        if (userLocation && isValidLatLng(userLocation.lat, userLocation.lng)) {
            const pos = new naver.maps.LatLng(userLocation.lat, userLocation.lng);
            const me = new naver.maps.Marker({
                position: pos,
                map,
                icon: {
                    content:
                        '<div style="width:18px;height:18px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 0 0 2px rgba(16,185,129,.3)"></div>',
                },
                zIndex: 20,
            });
            markersRef.current.push(me);
            bounds.extend(pos);
        }

        // 중심/줌 설정
        try {
            if (places.length === 1) {
                map.setCenter(new naver.maps.LatLng(places[0].latitude, places[0].longitude));
                map.setZoom(15);
            } else if (!bounds.isEmpty()) {
                map.fitBounds(bounds);
            }
        } catch {}

        // 경로 그리기 (단순 polyline)
        if (drawPath) {
            const coords: any[] = [];
            if (userLocation && isValidLatLng(userLocation.lat, userLocation.lng)) {
                coords.push(new naver.maps.LatLng(userLocation.lat, userLocation.lng));
            }
            places
                .filter((p) => isValidLatLng(p.latitude, p.longitude))
                .forEach((p) => coords.push(new naver.maps.LatLng(p.latitude, p.longitude)));
            if (coords.length >= 2) {
                pathRef.current = new naver.maps.Polyline({
                    map,
                    path: coords,
                    strokeColor: ancientStyle ? "#b45309" : "#10b981",
                    strokeOpacity: 0.9,
                    strokeWeight: 4,
                });
            }
        }
    }, [ready, places, userLocation, drawPath, ancientStyle, onPlaceClick]);

    return (
        <div className={`relative ${className}`} style={{ ...style, width: "100%", height: "100%" }}>
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: 300 }} />
            {!window.naver?.maps && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                    <Loading />
                </div>
            )}
        </div>
    );
}
