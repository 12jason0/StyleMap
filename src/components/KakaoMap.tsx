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
}: KakaoMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
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

        const bounds = new kakao.maps.LatLngBounds();

        // 장소 마커 생성
        places.forEach((place) => {
            const position = new kakao.maps.LatLng(place.latitude, place.longitude);
            const isSelected = selectedPlace?.id === place.id;

            // 기본 마커 사용 (이미지 없이)
            const marker = new kakao.maps.Marker({
                position: position,
                title: place.name,
            });

            marker.setMap(map);

            // 마커 클릭 이벤트
            kakao.maps.event.addListener(marker, "click", () => {
                console.log("마커 클릭됨:", place.name);
                onPlaceClick(place);
            });

            markersRef.current.push(marker);
            bounds.extend(position);
        });

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
    }, [places, selectedPlace, userLocation, onPlaceClick, isMapReady]);

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
