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
        FB: {
            init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
            AppEvents: {
                logPageView: () => void;
            };
            login: (callback: (response: any) => void, options?: { scope: string }) => void;
            getLoginStatus: (callback: (response: any) => void) => void;
            api: (path: string, callback: (response: any) => void) => void;
        };
    }
}

export {};
