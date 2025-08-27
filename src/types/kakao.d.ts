declare global {
    interface Window {
        kakao: {
            maps: {
                services: {
                    Geocoder: new () => {
                        coord2RegionCode: (
                            lng: number,
                            lat: number,
                            callback: (result: any[], status: string) => void
                        ) => void;
                    };
                    Status: {
                        OK: string;
                        ERROR: string;
                    };
                };
                Map: new (container: HTMLElement, options: any) => {
                    setCenter: (latlng: any) => void;
                    getCenter: () => any;
                    setLevel: (level: number) => void;
                    getLevel: () => number;
                };
                LatLng: new (lat: number, lng: number) => any;
                Marker: new (options: any) => {
                    setMap: (map: any) => void;
                    getPosition: () => any;
                };
            };
        };
    }
}

export {};
