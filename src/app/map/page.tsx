"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Container as MapDiv, NaverMap, Marker } from "react-naver-maps";

// --- 타입 정의 ---
interface Place {
    id: number | string;
    name: string;
    category: string;
    distance?: string;
    address: string;
    description?: string;
    rating?: number;
    phone?: string;
    website?: string;
    imageUrl?: string;
    latitude: number;
    longitude: number;
    courseId?: number; // 코스에서 변환된 항목일 경우 연결용 아이디
}

// --- 클래식 핀 마커 생성 함수 ---
function createReactNaverMapIcon(category: string, orderIndex?: number, isSelected: boolean = false) {
    const cat = category?.toLowerCase() || "";

    let color = "#10B981";
    let icon = "📍";

    if (cat.includes("카페") || cat.includes("cafe")) {
        color = "#8B5CF6";
        icon = "☕";
    } else if (cat.includes("음식") || cat.includes("식당") || cat.includes("맛집") || cat.includes("restaurant")) {
        color = "#EF4444";
        icon = "🍽️";
    } else if (cat.includes("관광") || cat.includes("명소") || cat.includes("랜드마크")) {
        color = "#10B981";
        icon = "📍";
    }

    const width = isSelected ? 44 : 36;
    const height = isSelected ? 54 : 46;
    const iconSize = isSelected ? 22 : 18;
    const numberSize = isSelected ? 13 : 11;
    const numberBox = isSelected ? 24 : 20;

    return {
        content: `
            <div style="position: relative; width: ${width}px; height: ${height}px;">
                <div style="
                    width: ${width}px; height: ${width}px; background: ${color};
                    border: 3px solid white; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.3); font-size: ${iconSize}px;
                ">${icon}</div>
                <div style="
                    position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
                    width: 0; height: 0; border-left: 8px solid transparent;
                    border-right: 8px solid transparent; border-top: 10px solid ${color};
                "></div>
                ${
                    orderIndex
                        ? `
                    <div style="
                        position: absolute; top: -8px; right: -8px; background: white;
                        border: 2px solid ${color}; border-radius: 50%;
                        width: ${numberBox}px; height: ${numberBox}px;
                        display: flex; align-items: center; justify-content: center;
                        font-size: ${numberSize}px; font-weight: bold; color: ${color};
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    ">${orderIndex}</div>
                `
                        : ""
                }
            </div>
        `,
        size: { width, height },
        anchor: { x: width / 2, y: height },
    };
}

interface Course {
    id: number;
    title: string;
    description: string;
    distance: number;
    start_place_name: string;
}

// --- 로딩 스피너 컴포넌트 ---
const LoadingSpinner = ({ text = "로딩 중..." }: { text?: string }) => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
        <p className="ml-3 text-gray-600">{text}</p>
    </div>
);

// --- 메인 지도 페이지 컴포넌트 ---
function MapPageInner() {
    const router = useRouter();
    const [mapsReady, setMapsReady] = useState(false);
    const navermaps = typeof window !== "undefined" ? (window as any).naver?.maps : null;
    const mapRef = useRef<any>(null);
    const suppressSearchButtonRef = useRef<boolean>(false);

    // 네이버 지도 SDK 보조 로더 (Provider가 못 불러왔을 때 대비)
    useEffect(() => {
        if (typeof window === "undefined") return;
        if ((window as any).naver?.maps) return; // 이미 로드됨
        const existing = Array.from(document.getElementsByTagName("script")).some((s) =>
            (s as HTMLScriptElement).src.includes("oapi.map.naver.com/openapi/v3/maps.js")
        );
        if (existing) return;

        const clientId =
            process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ||
            process.env.NEXT_PUBLIC_NAVER_MAP_API_KEY_ID ||
            process.env.NEXT_PUBLIC_NAVER_CLIENT_ID ||
            "";
        if (!clientId) {
            console.error("Naver Maps Client ID 미설정: NEXT_PUBLIC_NAVER_MAP_CLIENT_ID (또는 *_API_KEY_ID) 필요");
            return;
        }
        const tryParams = ["ncpKeyId", "ncpClientId"] as const;
        const loadWithParam = (param: (typeof tryParams)[number]) =>
            new Promise<void>((res, rej) => {
                const prev = document.getElementById("naver-maps-script-fallback");
                prev?.parentElement?.removeChild(prev as any);
                (window as any).navermap_authFailure = () => {
                    (window as any).navermap_authFailure = undefined;
                    rej(new Error("AUTH_FAILURE"));
                };
                const script = document.createElement("script");
                script.id = "naver-maps-script-fallback";
                script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?${param}=${encodeURIComponent(clientId)}`;
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    (window as any).navermap_authFailure = undefined;
                    setTimeout(() => setMapsReady(Boolean((window as any).naver?.maps)), 0);
                    res();
                };
                script.onerror = (e) => {
                    (window as any).navermap_authFailure = undefined;
                    rej(e as any);
                };
                document.head.appendChild(script);
            });

        (async () => {
            for (const p of tryParams) {
                try {
                    await loadWithParam(p);
                    return;
                } catch (e) {
                    console.warn("fallback 로더 재시도:", p, e);
                }
            }
            console.error("네이버 지도 SDK 로드 실패(all params)");
        })();
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if ((window as any).naver?.maps) {
            setMapsReady(true);
            return;
        }
        let attempts = 0;
        const timer = setInterval(() => {
            if ((window as any).naver?.maps) {
                setMapsReady(true);
                clearInterval(timer);
            } else if (++attempts > 100) {
                clearInterval(timer);
            }
        }, 100);
        return () => clearInterval(timer);
    }, []);

    // 메인 컨테이너(main) 스크롤 비활성화 및 전체 화면 고정
    useEffect(() => {
        try {
            const mainEl = document.querySelector("main") as HTMLElement | null;
            if (!mainEl) return;
            const previousClassName = mainEl.className;
            const previousStyle = { overflow: mainEl.style.overflow, height: mainEl.style.height } as const;
            mainEl.classList.remove("overflow-y-auto", "overscroll-contain", "no-scrollbar", "scrollbar-hide");
            mainEl.classList.add("overflow-hidden");
            if (!mainEl.style.height) mainEl.style.height = "100vh";
            return () => {
                try {
                    mainEl.className = previousClassName;
                    mainEl.style.overflow = previousStyle.overflow;
                    mainEl.style.height = previousStyle.height;
                } catch {}
            };
        } catch {}
    }, []);

    // --- 상태 관리 ---
    const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 37.5665, lng: 126.978 });
    const [zoom, setZoom] = useState(15);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [places, setPlaces] = useState<Place[]>([]);
    const [viewBounds, setViewBounds] = useState<BoundsBox | null>(null); // 현재 화면에 표시할 바운드(있으면 이 범위 내로만 표시)
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [activeTab, setActiveTab] = useState<"places" | "courses">("places");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(true);
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const prevPanOffsetYRef = useRef(0);
    const [showMapSearchButton, setShowMapSearchButton] = useState(false);
    const fetchAbortRef = useRef<AbortController | null>(null);

    const triggerMapResize = useCallback(() => {
        try {
            if (navermaps && mapRef.current) {
                navermaps.Event.trigger(mapRef.current, "resize");
            } else if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("resize"));
            }
        } catch {}
    }, [navermaps]);

    // --- 데이터 fetching 및 핸들러 ---
    type BoundsBox = { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } };
    type FetchOptions = { bounds?: BoundsBox; skipCourses?: boolean; limit?: number; injectPlace?: Place };

    const fetchPlacesAndCourses = useCallback(
        async (location: { lat: number; lng: number }, keyword?: string, opts?: FetchOptions) => {
            setLoading(true);
            setError(null);
            setSelectedPlace(null);

            try {
                // 이전 요청 중단
                try {
                    fetchAbortRef.current?.abort();
                } catch {}
                const aborter = new AbortController();
                fetchAbortRef.current = aborter;

                let placesUrl = `/api/places/search-kakao?lat=${location.lat}&lng=${location.lng}`;
                if (keyword && keyword.trim()) {
                    placesUrl += `&keyword=${encodeURIComponent(keyword)}`;
                }
                // 뷰포트 반경을 근사치로 radius 전달(서버가 무시해도 무해)
                if (opts?.bounds) {
                    const { sw, ne } = opts.bounds;
                    const dy = (ne.lat - sw.lat) * 111_320; // m (위도 1도 ≈ 111.32km)
                    const dx = (ne.lng - sw.lng) * 88_000; // m (한국 위도대 근사)
                    const radius = Math.round(Math.sqrt(dx * dx + dy * dy) / 2);
                    if (Number.isFinite(radius) && radius > 0) placesUrl += `&radius=${radius}`;
                }

                const regionParam = keyword && keyword.trim() ? `&region=${encodeURIComponent(keyword.trim())}` : "";
                const placesRes = await fetch(placesUrl, { signal: aborter.signal });
                let courseRes: Response | null = null;
                if (!opts?.skipCourses) {
                    try {
                        courseRes = await fetch(
                            `/api/courses/nearby?lat=${location.lat}&lng=${location.lng}${regionParam}`,
                            {
                                signal: aborter.signal,
                            }
                        );
                    } catch {}
                }

                if (!placesRes.ok) throw new Error("장소 정보를 가져오는 데 실패했습니다.");
                const placesData = await placesRes.json();
                let fetchedPlaces: Place[] = (placesData.success ? placesData.places : []).map((p: any) => ({
                    ...p,
                    latitude: parseFloat(p.latitude),
                    longitude: parseFloat(p.longitude),
                }));

                // 좌표 유효한 항목만 유지
                fetchedPlaces = fetchedPlaces.filter(
                    (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
                );

                // 카테고리 필터
                // 기본: 음식점/카페만. 검색(keyword) 있을 때는 랜드마크(관광/명소/랜드마크/타워/박물관 등)도 허용
                try {
                    const allowLandmarks = Boolean(keyword && keyword.trim());
                    fetchedPlaces = fetchedPlaces.filter((p) => {
                        const c = String(p.category || "");
                        const n = String(p.name || "");
                        const isReservoir = n.includes("저수지") || c.includes("저수지");
                        if (isReservoir) return false;
                        const isCafeFood =
                            c.includes("카페") || c.includes("음식") || c.includes("맛집") || c.includes("식당");
                        const isLandmark =
                            allowLandmarks &&
                            (c.includes("관광") ||
                                c.includes("명소") ||
                                c.includes("랜드마크") ||
                                c.includes("공원") ||
                                c.includes("박물관") ||
                                n.includes("타워") ||
                                n.includes("전망") ||
                                n.includes("랜드마크"));
                        return isCafeFood || isLandmark;
                    });
                } catch {}

                // 현재 지도 영역(bounds)이 주어지면 그 내부에 있는 장소만 표시
                if (opts?.bounds) {
                    try {
                        const { sw, ne } = opts.bounds;
                        fetchedPlaces = fetchedPlaces.filter(
                            (p) =>
                                Number.isFinite(p.latitude) &&
                                Number.isFinite(p.longitude) &&
                                p.latitude >= sw.lat &&
                                p.latitude <= ne.lat &&
                                p.longitude >= sw.lng &&
                                p.longitude <= ne.lng
                        );
                    } catch {}
                }

                // 중심과의 거리 기준 정렬 후 제한 개수로 절단
                try {
                    const toRad = (v: number) => (v * Math.PI) / 180;
                    const clat = location.lat;
                    const clng = location.lng;
                    fetchedPlaces.sort((a, b) => {
                        const dlatA = toRad(a.latitude - clat);
                        const dlngA = toRad(a.longitude - clng);
                        const dA = dlatA * dlatA + dlngA * dlngA;
                        const dlatB = toRad(b.latitude - clat);
                        const dlngB = toRad(b.longitude - clng);
                        const dB = dlatB * dlatB + dlngB * dlngB;
                        return dA - dB;
                    });
                    if (opts?.limit && fetchedPlaces.length > opts.limit) {
                        fetchedPlaces = fetchedPlaces.slice(0, opts.limit);
                    }
                } catch {}

                // 검색으로 지정된 특정 장소를 목록에 반드시 포함 (중복 방지)
                if (opts?.injectPlace) {
                    try {
                        const jp = opts.injectPlace;
                        const cat = String(jp.category || "");
                        const name = String(jp.name || "");
                        const isReservoir = name.includes("저수지") || cat.includes("저수지");
                        const allowLandmarks = Boolean(keyword && keyword.trim());
                        const allow =
                            !isReservoir &&
                            (cat.includes("카페") ||
                                cat.includes("음식") ||
                                cat.includes("맛집") ||
                                cat.includes("식당") ||
                                (allowLandmarks &&
                                    (cat.includes("관광") ||
                                        cat.includes("명소") ||
                                        cat.includes("랜드마크") ||
                                        cat.includes("공원") ||
                                        cat.includes("박물관") ||
                                        name.includes("타워") ||
                                        name.includes("전망") ||
                                        name.includes("랜드마크"))));
                        if (allow && Number.isFinite(jp.latitude) && Number.isFinite(jp.longitude)) {
                            const exists = fetchedPlaces.some(
                                (p) =>
                                    (p.id && jp.id && String(p.id) === String(jp.id)) ||
                                    (p.name === jp.name &&
                                        Math.abs(p.latitude - jp.latitude) < 1e-5 &&
                                        Math.abs(p.longitude - jp.longitude) < 1e-5)
                            );
                            if (!exists) {
                                fetchedPlaces.unshift(jp);
                            }
                        }
                    } catch {}
                }

                let courseList: any[] = [];
                try {
                    if (courseRes && courseRes.ok) {
                        const courseData = await courseRes.json();
                        const list = courseData.success ? courseData.courses : [];
                        courseList = list;
                        setCourses(list);
                        // 검색어가 있을 때 코스가 존재하면 추천 코스 탭으로 자동 전환
                        if (keyword && keyword.trim() && Array.isArray(list) && list.length > 0) {
                            setActiveTab("courses");
                        }
                    } else if (!opts?.skipCourses) {
                        console.warn("코스 정보를 가져오는 데 실패했습니다.");
                        setCourses([]);
                    }
                } catch {}

                // 검색 결과의 주변 장소는 카카오 데이터만 사용
                setPlaces(fetchedPlaces);
            } catch (e: any) {
                if (e?.name === "AbortError") return; // 중단된 요청 무시
                setError(e.message || "데이터를 불러오는 데 실패했습니다.");
                setPlaces([]);
                setCourses([]);
            } finally {
                setLoading(false);
                fetchAbortRef.current = null;
            }
        },
        []
    );

    const handleSearch = useCallback(async () => {
        // 검색은 현재 지도 중심이 아닌, 검색어 자체의 위치를 기준으로 합니다.
        if (!searchInput.trim()) return;
        setLoading(true);
        setError(null);
        try {
            // '/api/places/search-single'은 단일 장소의 좌표를 얻기 위해 사용
            const res = await fetch(`/api/places/search-single?query=${encodeURIComponent(searchInput)}`);
            const data = await res.json();

            if (data.success && data.place) {
                const foundPlaceLocation = {
                    lat: parseFloat(data.place.lat),
                    lng: parseFloat(data.place.lng),
                };
                // 검색된 장소 객체를 구성 (패널/핀에 주입용)
                const injected: Place = {
                    id: data.place.id ?? `${Date.now()}`,
                    name: data.place.name || searchInput,
                    category: data.place.category || "",
                    address: data.place.address || "",
                    latitude: parseFloat(data.place.lat),
                    longitude: parseFloat(data.place.lng),
                    imageUrl: data.place.imageUrl || undefined,
                };

                // 검색된 장소의 위치를 중심으로 주변 장소와 코스를 다시 불러옵니다.
                setCenter(foundPlaceLocation);
                await fetchPlacesAndCourses(foundPlaceLocation, searchInput, { limit: 50, injectPlace: injected });

                // 추천 코스에 해당 장소가 포함된 코스를 우선 노출하기 위해 region 파라미터에 장소명 포함
                try {
                    setActiveTab("courses");
                    const params = new URLSearchParams({
                        lat: String(foundPlaceLocation.lat),
                        lng: String(foundPlaceLocation.lng),
                        region: injected.name,
                        radius: "2000",
                    }).toString();
                    const courseRes = await fetch(`/api/courses/nearby?${params}`);
                    const courseData = await courseRes.json();
                    if (courseRes.ok && courseData.success && Array.isArray(courseData.courses)) {
                        setCourses(courseData.courses);
                    }
                } catch {}
                setSearchInput(""); // 검색 후 입력창 초기화
            } else {
                throw new Error(data.error || "검색 결과가 없습니다.");
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "검색 중 오류 발생");
            setPlaces([]);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    }, [searchInput, fetchPlacesAndCourses]);

    // --- UI 로직 ---
    useEffect(() => {
        // 웹에서도 항상 모바일 UI를 사용하도록 강제
        setIsMobile(true);
        setLeftPanelOpen(true);
    }, []);

    // 빠른 현재 위치 가져오기: 캐시 허용 + 낮은 정확도 + 짧은 타임아웃
    const getQuickLocation = useCallback(async (): Promise<{ lat: number; lng: number }> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation 지원 안됨"));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(err),
                { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60 * 1000 }
            );
        });
    }, []);

    useEffect(() => {
        if (!mapsReady) return; // 지도 SDK 준비 후 최초 데이터 로드 실행
        (async () => {
            try {
                const loc = await getQuickLocation();
                setUserLocation(loc);
                setCenter(loc);
                fetchPlacesAndCourses(loc, undefined, { limit: 50, skipCourses: true });
            } catch {
                // 위치 권한 실패 시: 초기에는 검색을 수행하지 않고 사용자 조작을 기다림
                setError("현재 위치를 가져오지 못했습니다. 위치 권한을 허용하거나 상단 검색을 이용하세요.");
                setPlaces([]);
                setCourses([]);
            }
        })();
    }, [mapsReady, fetchPlacesAndCourses, getQuickLocation]);

    // 패널이 열릴 때 지도 중심을 패널을 제외한 영역의 시각적 중앙으로 보정
    useEffect(() => {
        let timer: any;
        try {
            if (!navermaps || !mapRef.current) return;
            // 패널 애니메이션 완료 후 보정. "열릴 때만" 지도 위치를 이동시키고, 닫힐 때는 이동하지 않음.
            timer = setTimeout(() => {
                try {
                    if (isMobile && leftPanelOpen) {
                        const map = mapRef.current as any;
                        const containerEl = document.getElementById("naver-map-container") as HTMLElement | null;
                        const containerHeight = containerEl?.clientHeight || window.innerHeight;
                        const desiredOffsetY = Math.round(-0.3 * containerHeight);
                        const delta = desiredOffsetY - (prevPanOffsetYRef.current || 0);
                        if (delta !== 0) {
                            map.panBy(0, delta);
                            prevPanOffsetYRef.current = desiredOffsetY;
                        }
                    } else if (!leftPanelOpen) {
                        // 닫힐 때는 중심을 움직이지 않고 기준값만 리셋하여 다음에 열릴 때 보정이 다시 적용되도록 함
                        prevPanOffsetYRef.current = 0;
                    }
                } catch {}
            }, 350);
        } catch {}
        return () => {
            try {
                if (timer) clearTimeout(timer);
            } catch {}
        };
    }, [leftPanelOpen, isMobile, navermaps]);

    const handlePlaceClick = (place: Place) => {
        setSelectedPlace(place);
        setCenter({ lat: place.latitude, lng: place.longitude });
        setZoom(17); // 장소 클릭 시 더 확대
        setActiveTab("places"); // 패널은 항상 장소 탭
        setLeftPanelOpen(true); // 모바일/데스크탑 상관없이 패널 열기
    };

    const resetPanelState = (closePanel: boolean = false) => {
        setSelectedPlace(null);
        if (isMobile && closePanel) {
            setLeftPanelOpen(false);
        }
    };

    const formatDistance = useCallback(
        (p: Place) => {
            if (!userLocation) return ""; // 사용자 위치가 없으면 거리 계산 불가
            try {
                const R = 6371e3; // meters
                const toRad = (v: number) => (v * Math.PI) / 180;
                const φ1 = toRad(userLocation.lat);
                const φ2 = toRad(p.latitude);
                const Δφ = toRad(p.latitude - userLocation.lat);
                const Δλ = toRad(p.longitude - userLocation.lng);

                const a =
                    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const dist = R * c;

                if (!Number.isFinite(dist)) return "";
                return dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`;
            } catch {
                return "";
            }
        },
        [userLocation]
    );

    const centerLatLng = useMemo(() => {
        if (!navermaps) return null;
        return new navermaps.LatLng(center.lat, center.lng);
    }, [center, navermaps]);

    // 화면 표시용 장소 목록 (viewBounds가 있으면 해당 영역 내로만 필터링)
    const filteredPlaces = useMemo(() => {
        const finite = places.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
        if (!viewBounds) return finite;
        try {
            const { sw, ne } = viewBounds;
            return finite.filter(
                (p) => p.latitude >= sw.lat && p.latitude <= ne.lat && p.longitude >= sw.lng && p.longitude <= ne.lng
            );
        } catch {
            return finite;
        }
    }, [places, viewBounds]);

    // 지도 클릭 시: 선택 해제하고 목록으로 복귀 (패널은 유지)
    useEffect(() => {
        if (!navermaps || !mapRef.current) return;
        const map = mapRef.current as any;
        const clickListener = navermaps.Event.addListener(map, "click", () => {
            // 패널 내 "목록으로" 버튼과 동일 동작 + 패널 열기
            try {
                setLeftPanelOpen(true);
                resetPanelState();
            } catch {
                setLeftPanelOpen(true);
                setSelectedPlace(null);
            }
        });
        const dragStartListener = navermaps.Event.addListener(map, "dragstart", () => {
            suppressSearchButtonRef.current = false;
            setShowMapSearchButton(true);
        });
        const dragEndListener = navermaps.Event.addListener(map, "dragend", () => {
            setShowMapSearchButton(true);
        });
        const idleListener = navermaps.Event.addListener(map, "idle", () => {
            // 이동이 완료되어도 버튼이 노출되도록 보장
            setShowMapSearchButton(true);
        });
        // 사용자의 임의 상호작용(터치/포인터 다운) 시에도 버튼 재활성화
        const containerEl = document.getElementById("naver-map-container");
        const resetSuppression = () => {
            suppressSearchButtonRef.current = false;
            setShowMapSearchButton(true);
        };
        try {
            containerEl?.addEventListener("pointerdown", resetSuppression, { passive: true } as any);
            containerEl?.addEventListener("touchstart", resetSuppression, { passive: true } as any);
        } catch {}
        return () => {
            try {
                if (clickListener) navermaps.Event.removeListener(clickListener);
                if (dragStartListener) navermaps.Event.removeListener(dragStartListener);
                if (dragEndListener) navermaps.Event.removeListener(dragEndListener);
                if (idleListener) navermaps.Event.removeListener(idleListener);
                containerEl?.removeEventListener("pointerdown", resetSuppression as any);
                containerEl?.removeEventListener("touchstart", resetSuppression as any);
            } catch {}
        };
    }, [navermaps, mapRef, isMobile]);

    if (!mapsReady || !navermaps || !centerLatLng) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoadingSpinner text="지도 초기화 중..." />
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden relative">
            {/* --- 왼쪽 정보 패널 --- */}
            <div
                className={`z-40 flex flex-col bg-white overflow-hidden pb-20
                    ${
                        isMobile
                            ? `transition-transform duration-300 absolute inset-x-0 bottom-0 h-[60vh] rounded-t-2xl shadow-2xl ${
                                  leftPanelOpen ? "translate-y-0" : "translate-y-full"
                              }`
                            : `transition-[width] duration-300 h-full border-r border-gray-200 ${
                                  leftPanelOpen ? "w-96" : "w-0 overflow-hidden"
                              }`
                    }`}
                onTransitionEnd={triggerMapResize}
            >
                {/* 검색창 및 헤더 */}
                <div className="flex-shrink-0 sticky top-0 z-10 p-3 md:p-4 bg-white/80 backdrop-blur border-b">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="장소, 음식, 카페 검색"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 placeholder:text-gray-400 bg-white/90"
                        />
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 hover:cursor-pointer shadow-sm"
                            disabled={loading}
                        >
                            검색
                        </button>
                    </div>
                </div>

                {/* 탭 메뉴 */}
                <div className="flex border-b flex-shrink-0 ">
                    <button
                        onClick={() => {
                            setActiveTab("places");
                            setSelectedPlace(null);
                        }}
                        className={`flex-1 p-3 font-semibold hover:cursor-pointer ${
                            activeTab === "places" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
                        }`}
                    >
                        주변 장소 ({selectedPlace ? 1 : filteredPlaces.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("courses")}
                        className={`flex-1 p-3 font-semibold hover:cursor-pointer ${
                            activeTab === "courses" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
                        }`}
                    >
                        추천 코스 ({courses.length})
                    </button>
                </div>

                {/* 콘텐츠 목록 */}
                <div className={`flex-1 p-2 ${selectedPlace ? "overflow-hidden" : "overflow-y-auto"}`}>
                    {loading ? (
                        <LoadingSpinner />
                    ) : error ? (
                        <div className="text-red-500 p-4 text-center">{error}</div>
                    ) : activeTab === "places" ? (
                        selectedPlace ? (
                            // 장소 상세 정보 - StyleMap 톤(그린 계열) 적용 카드 스타일
                            <div className="p-2">
                                <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-2">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5 leading-snug">
                                        {selectedPlace.name}
                                    </h3>
                                    <div className="flex items-center gap-1 text-gray-700 mb-0.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-2.5 h-2.5 text-blue-700"
                                        >
                                            <path d="M9.813 15.904C7.024 14.946 5 12.248 5 9a7 7 0 1 1 14 0c0 3.248-2.024 5.946-4.813 6.904l-.4 1.6a2 2 0 0 1-1.94 1.496h-1.694a2 2 0 0 1-1.94-1.496l-.4-1.6z" />
                                        </svg>
                                        <span className="font-medium text-xs">{selectedPlace.category || "장소"}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-700 mb-0.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-2.5 h-2.5 text-blue-700"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M12 2.25c-4.28 0-7.75 3.47-7.75 7.75 0 5.813 6.514 11.258 7.18 11.815a1 1 0 0 0 1.14 0c.666-.557 7.18-6.002 7.18-11.815 0-4.28-3.47-7.75-7.75-7.75Zm0 10.25a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span className="text-gray-700 text-xs">{selectedPlace.address}</span>
                                    </div>
                                    {selectedPlace.phone && (
                                        <div className="flex items-center gap-1 text-gray-700 mb-1.5">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className="w-2.5 h-2.5 text-blue-700"
                                            >
                                                <path d="M2.25 5.25A2.25 2.25 0 0 1 4.5 3h2.708a2.25 2.25 0 0 1 2.132 1.552l.762 2.287a2.25 2.25 0 0 1-.54 2.316l-1.2 1.2a14.25 14.25 0 0 0 5.484 5.484l1.2-1.2a2.25 2.25 0 0 1 2.316-.54l2.287.762A2.25 2.25 0 0 1 21 16.792V19.5a2.25 2.25 0 0 1-2.25 2.25h-.75C9.716 21.75 2.25 14.284 2.25 5.25v0Z" />
                                            </svg>
                                            <span className="tracking-wide font-medium text-xs">
                                                {selectedPlace.phone}
                                            </span>
                                        </div>
                                    )}
                                    <div className="mt-1.5 flex gap-2">
                                        <button
                                            onClick={() =>
                                                window.open(
                                                    `https://map.naver.com/v5/search/${encodeURIComponent(
                                                        selectedPlace.name
                                                    )}`,
                                                    "_blank"
                                                )
                                            }
                                            className="px-2.5 py-1 rounded-full border border-blue-500 text-blue-700 bg-white font-semibold text-xs hover:bg-blue-50 transition-colors hover:cursor-pointer flex items-center gap-1 shadow-sm"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className="w-2.5 h-2.5"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M12 2.25c-4.28 0-7.75 3.47-7.75 7.75 0 5.813 6.514 11.258 7.18 11.815a1 1 0 0 0 1.14 0c.666-.557 7.18-6.002 7.18-11.815 0-4.28-3.47-7.75-7.75-7.75Zm0 10.25a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            지도 보기
                                        </button>
                                        <button
                                            onClick={() =>
                                                selectedPlace.phone
                                                    ? (window.location.href = `tel:${selectedPlace.phone}`)
                                                    : undefined
                                            }
                                            disabled={!selectedPlace.phone}
                                            className={`px-2.5 py-1 rounded-full font-semibold text-white text-xs flex items-center gap-1 hover:cursor-pointer transition-colors shadow-sm ${
                                                selectedPlace.phone
                                                    ? "bg-blue-600 hover:bg-blue-700"
                                                    : "bg-gray-300 cursor-not-allowed"
                                            }`}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className="w-2.5 h-2.5"
                                            >
                                                <path d="M2.25 5.25A2.25 2.25 0 0 1 4.5 3h2.708a2.25 2.25 0 0 1 2.132 1.552l.762 2.287a2.25 2.25 0 0 1-.54 2.316l-1.2 1.2a14.25 14.25 0 0 0 5.484 5.484l1.2-1.2a2.25 2.25 0 0 1 2.316-.54l2.287.762A2.25 2.25 0 0 1 21 16.792V19.5a2.25 2.25 0 0 1-2.25 2.25h-.75C9.716 21.75 2.25 14.284 2.25 5.25v0Z" />
                                            </svg>
                                            전화하기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : // 장소 목록
                        (selectedPlace ? [selectedPlace] : filteredPlaces).length > 0 ? (
                            (selectedPlace ? [selectedPlace] : filteredPlaces).map((place) => (
                                <div
                                    key={place.id}
                                    onClick={() => {
                                        if ((place as any).courseId) {
                                            router.push(`/courses/${(place as any).courseId}`);
                                        } else {
                                            handlePlaceClick(place);
                                        }
                                    }}
                                    className="group p-4 mb-2 cursor-pointer bg-white hover:bg-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-semibold text-gray-900 truncate pr-2 text-base md:text-lg">
                                            {place.name}
                                        </h4>
                                        {userLocation && (
                                            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 ring-1 ring-gray-200">
                                                {formatDistance(place)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">{place.address}</p>
                                    <p className="text-xs text-gray-400 truncate">{place.category}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 pt-10">주변 장소가 없습니다.</div>
                        )
                    ) : // 코스 목록
                    courses.length > 0 ? (
                        courses.map((course) => (
                            <div
                                key={course.id}
                                onClick={() => router.push(`/courses/${course.id}`)}
                                className="group p-4 mb-2 cursor-pointer bg-white hover:bg-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
                            >
                                <h4 className="font-semibold text-gray-800">{course.title}</h4>
                                <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 pt-10">주변에 추천 코스가 없습니다.</div>
                    )}
                </div>
            </div>

            {/* --- 네이버 지도 --- */}
            <div className="flex-1 h-full relative overflow-hidden">
                <MapDiv style={{ width: "100%", height: "100%" }} id="naver-map-container">
                    <NaverMap
                        ref={mapRef}
                        center={centerLatLng}
                        zoom={zoom}
                        onCenterChanged={(c) => {
                            try {
                                const lat = typeof (c as any).lat === "function" ? (c as any).lat() : (c as any).y;
                                const lng = typeof (c as any).lng === "function" ? (c as any).lng() : (c as any).x;
                                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                                    setCenter({ lat, lng });
                                    setShowMapSearchButton(true);
                                }
                            } catch {}
                        }}
                        onZoomChanged={(z) => {
                            if (Number.isFinite(z as number)) setZoom(z as number);
                            setShowMapSearchButton(true);
                        }}
                    >
                        {userLocation && (
                            <Marker
                                position={new navermaps.LatLng(userLocation.lat, userLocation.lng)}
                                title="현재 위치"
                                zIndex={300}
                            />
                        )}
                        {(selectedPlace ? [selectedPlace] : filteredPlaces).map((place, idx) => {
                            const isSel = selectedPlace?.id === place.id;
                            const markerIcon = createReactNaverMapIcon(place.category, undefined, isSel);

                            return (
                                <Marker
                                    key={place.id}
                                    position={new navermaps.LatLng(place.latitude, place.longitude)}
                                    title={place.name}
                                    onClick={() => handlePlaceClick(place)}
                                    zIndex={isSel ? 100 : 10}
                                    icon={{
                                        content: markerIcon.content,
                                        size: new navermaps.Size(markerIcon.size.width, markerIcon.size.height),
                                        anchor: new navermaps.Point(markerIcon.anchor.x, markerIcon.anchor.y),
                                    }}
                                />
                            );
                        })}
                    </NaverMap>
                </MapDiv>

                {/* 닫기(X): 단일 장소 상세 보기일 때만 표시 → 전체 정보(목록/모든 핀)로 복귀 */}
                {selectedPlace && (
                    <button
                        onClick={() => {
                            setSelectedPlace(null);
                            setLeftPanelOpen(true);
                        }}
                        className="hover:cursor-pointer absolute right-3 top-3 z-50 bg-white/95 backdrop-blur border border-gray-300 rounded-full w-9 h-9 shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50"
                        aria-label="닫기"
                        title="닫기"
                    >
                        ×
                    </button>
                )}

                {/* --- 지도 위 UI 컨트롤 --- */}
                {showMapSearchButton && (
                    <div className={`absolute ${isMobile ? "top-5" : "bottom-6"} left-1/2 -translate-x-1/2 z-20`}>
                        <button
                            onClick={async () => {
                                setShowMapSearchButton(false);
                                suppressSearchButtonRef.current = true;
                                setLeftPanelOpen(true);
                                // 이전 코스 결과 제거 후 현재 지도에서만 추천 코스 재검색
                                setCourses([]);
                                setActiveTab("courses");
                                // 현재 지도 영역의 바운드를 구해 그 안의 장소만 표시
                                let boundsArg: BoundsBox | undefined = undefined;
                                try {
                                    const map = mapRef.current as any;
                                    const b = map?.getBounds?.();
                                    if (b && typeof b.getSW === "function" && typeof b.getNE === "function") {
                                        const sw = b.getSW();
                                        const ne = b.getNE();
                                        const swLat = typeof sw.lat === "function" ? sw.lat() : sw.y;
                                        const swLng = typeof sw.lng === "function" ? sw.lng() : sw.x;
                                        const neLat = typeof ne.lat === "function" ? ne.lat() : ne.y;
                                        const neLng = typeof ne.lng === "function" ? ne.lng() : ne.x;
                                        if ([swLat, swLng, neLat, neLng].every((v) => Number.isFinite(v))) {
                                            boundsArg = {
                                                sw: { lat: swLat, lng: swLng },
                                                ne: { lat: neLat, lng: neLng },
                                            };
                                        }
                                    }
                                } catch {}
                                setViewBounds(boundsArg || null);
                                await fetchPlacesAndCourses(center, undefined, {
                                    bounds: boundsArg,
                                    limit: 50,
                                    skipCourses: true,
                                });

                                // 추천 코스: 현재 지도 중심/바운드 기반 반경 추정 후 조회
                                try {
                                    let radius = 2000;
                                    if (boundsArg) {
                                        const { sw, ne } = boundsArg;
                                        const dy = (ne.lat - sw.lat) * 111_320;
                                        const dx = (ne.lng - sw.lng) * 88_000;
                                        const r = Math.round(Math.sqrt(dx * dx + dy * dy) / 2);
                                        if (Number.isFinite(r) && r > 0) radius = r;
                                    }
                                    const params = new URLSearchParams({
                                        lat: String(center.lat),
                                        lng: String(center.lng),
                                        radius: String(radius),
                                    }).toString();
                                    const cr = await fetch(`/api/courses/nearby?${params}`);
                                    const cd = await cr.json();
                                    if (cr.ok && cd?.success && Array.isArray(cd.courses) && cd.courses.length > 0) {
                                        setCourses(cd.courses);
                                    } else {
                                        setCourses([]);
                                    }
                                } catch {
                                    setCourses([]);
                                }
                            }}
                            className="px-3 py-1.5 bg-white text-gray-700 border text-sm  border-gray-300 rounded-full shadow-xl hover:bg-gray-50 hover:cursor-pointer backdrop-blur"
                        >
                            현재 지도에서 검색
                        </button>
                    </div>
                )}

                <div
                    className={`absolute right-4 ${
                        isMobile ? "top-20" : "bottom-6"
                    } z-10 flex flex-col gap-2 items-end`}
                >
                    <button
                        onClick={() => {
                            (async () => {
                                try {
                                    const loc = await getQuickLocation();
                                    setUserLocation(loc);
                                    setCenter(loc);
                                    setZoom(15);
                                } catch {
                                    if (userLocation) {
                                        setCenter(userLocation);
                                        setZoom(15);
                                    } else {
                                        setError("현재 위치를 가져오지 못했습니다. 위치 권한을 확인해 주세요.");
                                    }
                                }
                            })();
                        }}
                        className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 hover:cursor-pointer text-black"
                        title="내 위치로 이동"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>

                    <div className="bg-white rounded-full shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                        <button
                            onClick={() => setZoom((z) => Math.min(21, z + 1))}
                            className="px-3 py-2 hover:bg-gray-100 text-lg font-semibold hover:cursor-pointer text-black"
                            title="확대"
                        >
                            +
                        </button>
                        <span className="block h-px w-full bg-gray-200" />
                        <button
                            onClick={() => setZoom((z) => Math.max(0, z - 1))}
                            className="px-3 py-2 hover:bg-gray-100 text-lg font-semibold hover:cursor-pointer text-black"
                            title="축소"
                        >
                            -
                        </button>
                    </div>
                </div>

                {!isMobile && (
                    <button
                        onClick={() => {
                            setLeftPanelOpen((v) => !v);
                            setTimeout(triggerMapResize, 320);
                        }}
                        className="hover:cursor-pointer fixed top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-r-lg px-2 py-4 shadow-md hover:bg-gray-50 transition-all duration-300 z-50"
                        style={{ left: leftPanelOpen ? "24rem" : "0" }}
                        title={leftPanelOpen ? "패널 닫기" : "패널 열기"}
                    >
                        <span className="text-gray-600 text-sm ">{leftPanelOpen ? "◀" : "▶"}</span>
                    </button>
                )}
                {isMobile && (
                    <button
                        onClick={() => {
                            setLeftPanelOpen((v) => !v);
                            setTimeout(triggerMapResize, 320);
                        }}
                        className="hover:cursor-pointer absolute left-1/2 -translate-x-1/2 bg-white border border-gray-300 rounded-full px-3 py-1 shadow-md hover:bg-gray-50 transition-all duration-300 z-50"
                        style={{
                            bottom: leftPanelOpen ? "calc(60vh + 16px)" : "calc(env(safe-area-inset-bottom) + 150px)",
                        }}
                        title={leftPanelOpen ? "패널 닫기" : "패널 열기"}
                    >
                        <span className="text-gray-700 text-xl ">{leftPanelOpen ? "▾" : "▴"}</span>
                    </button>
                )}
            </div>
        </div>
    );
}

// Suspense로 감싸서 useSearchParams 사용에 대한 Next.js 권장사항 준수
export default function MapPage() {
    return (
        <Suspense
            fallback={
                <div className="h-screen flex items-center justify-center">
                    <LoadingSpinner text="페이지 준비 중..." />
                </div>
            }
        >
            <MapPageInner />
        </Suspense>
    );
}
