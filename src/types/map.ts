export interface Place {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    imageUrl?: string;
    description?: string;
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
}
