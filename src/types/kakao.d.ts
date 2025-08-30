/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
    interface Window {
        kakao: {
            maps: {
                services: {
                    Geocoder: new () => {
                        coord2RegionCode: (
                            lng: number,
                            lat: number,
                            callback: (result: unknown[], status: string) => void
                        ) => void;
                    };
                    Status: {
                        OK: string;
                        ERROR: string;
                    };
                };
                Map: new (container: HTMLElement, options: unknown) => {
                    setCenter: (latlng: unknown) => void;
                    getCenter: () => unknown;
                    setLevel: (level: number) => void;
                    getLevel: () => number;
                };
                LatLng: new (lat: number, lng: number) => unknown;
                Marker: new (options: unknown) => {
                    setMap: (map: unknown) => void;
                    getPosition: () => unknown;
                };
            };
        };
    }
}

export {};
