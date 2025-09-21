export interface Place {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    imageUrl?: string;
    description?: string;
    iconUrl?: string; // 커스텀 마커 아이콘 (고대 룬 등)
}

export interface UserLocation {
    lat: number;
    lng: number;
}

export interface KakaoMapProps {
    places: Place[];
    userLocation: UserLocation | null;
    selectedPlace: Place | null;
    onPlaceClick: (place: Place) => void;
    className?: string;
    style?: React.CSSProperties;
    draggable?: boolean;
    drawPath?: boolean; // 경로 표시 여부 (기본 false)
    routeMode?: "simple" | "walking" | "foot" | "driving"; // 경로 모드 (기본 simple)
    ancientStyle?: boolean; // 고대 유물 스타일 오버레이
    highlightPlaceId?: number; // 강조 효과를 줄 place id
}
