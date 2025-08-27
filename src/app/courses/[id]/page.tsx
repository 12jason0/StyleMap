"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

interface Place {
    id: number;
    name: string;
    address: string;
    description: string;
    category: string;
    avg_cost_range: string;
    opening_hours: string;
    phone?: string;
    website?: string;
    parking_available: boolean;
    reservation_required: boolean;
    latitude: number;
    longitude: number;
    image_url?: string;
}

interface CoursePlace {
    id: number;
    course_id: number;
    place_id: number;
    order_index: number;
    estimated_duration: number;
    recommended_time: string;
    notes?: string;
    place: Place; // 조인된 장소 정보
}

interface Course {
    id: string;
    title: string;
    description: string;
    duration: string;
    price: string;
    imageUrl: string;
    concept: string;
    rating: number;
    isPopular: boolean;
    recommendedTime: string;
    season: string;
    courseType: string;
    transportation: string;
    parking: string;
    reservationRequired: boolean;
    createdAt: string;
    updatedAt: string;
}

interface Highlight {
    id: number;
    icon: string;
    title: string;
    description: string;
}

interface Benefit {
    id: number;
    benefit_text: string;
    category: string;
    display_order?: number;
}

interface Notice {
    id: number;
    notice_text: string;
    type: string;
}

interface Contact {
    id: number;
    type: string;
    icon: string;
    label: string;
    value: string;
    description: string;
}

interface CourseData extends Course {
    highlights?: Highlight[];
    benefits?: Benefit[];
    notices?: Notice[];
    contacts?: Contact[];
    coursePlaces?: CoursePlace[]; // 코스에 포함된 장소들
}

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [courseData, setCourseData] = useState<CourseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [markers, setMarkers] = useState<any[]>([]);

    // 전역 함수로 지도 중심 이동 기능 추가
    useEffect(() => {
        (window as any).showPlaceOnMap = (lat: number, lng: number) => {
            if (map) {
                const kakao = (window as any).kakao;
                const position = new kakao.maps.LatLng(lat, lng);
                map.setCenter(position);
                map.setLevel(3);
            }
        };

        return () => {
            delete (window as any).showPlaceOnMap;
        };
    }, [map]);

    // 카카오맵 초기화
    useEffect(() => {
        const loadKakaoMap = () => {
            if ((window as any).kakao && (window as any).kakao.maps) {
                initializeMap();
            } else {
                const script = document.createElement("script");
                script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_ACTUAL_KAKAO_MAP_API_KEY&libraries=services,clusterer`;
                script.async = true;
                script.onload = () => {
                    (window as any).kakao.maps.load(() => {
                        initializeMap();
                    });
                };
                document.head.appendChild(script);
            }
        };

        const initializeMap = () => {
            if (!mapRef.current) return;

            const kakao = (window as any).kakao;
            const options = {
                center: new kakao.maps.LatLng(37.5665, 126.978), // 서울 시청
                level: 8,
            };

            const kakaoMap = new kakao.maps.Map(mapRef.current, options);
            setMap(kakaoMap);

            // 코스 장소들이 있으면 마커 추가
            if (courseData?.coursePlaces && courseData.coursePlaces.length > 0) {
                addMarkersToMap(kakaoMap, courseData.coursePlaces);
            }
        };

        const addMarkersToMap = (kakaoMap: any, places: CoursePlace[]) => {
            const kakao = (window as any).kakao;
            const newMarkers: any[] = [];
            const bounds = new kakao.maps.LatLngBounds();

            places.forEach((coursePlace, index) => {
                if (coursePlace.place.latitude && coursePlace.place.longitude) {
                    const position = new kakao.maps.LatLng(coursePlace.place.latitude, coursePlace.place.longitude);

                    // 마커 이미지 설정
                    const markerImage = new kakao.maps.MarkerImage(
                        `data:image/svg+xml;base64,${btoa(`
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="20" fill="#6366f1"/>
                                <text x="20" y="26" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${
                                    index + 1
                                }</text>
                            </svg>
                        `)}`,
                        new kakao.maps.Size(40, 40)
                    );

                    const marker = new kakao.maps.Marker({
                        position: position,
                        map: kakaoMap,
                        title: coursePlace.place.name,
                        image: markerImage,
                    });

                    // 인포윈도우 생성
                    const infowindow = new kakao.maps.InfoWindow({
                        content: `
                            <div style="padding: 15px; min-width: 250px; font-family: Arial, sans-serif;">
                                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #333;">${coursePlace.place.name}</h3>
                                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${coursePlace.place.category}</p>
                                <p style="margin: 0 0 12px 0; font-size: 12px; color: #999;">${coursePlace.place.address}</p>
                                <button 
                                    onclick="window.showPlaceOnMap(${coursePlace.place.latitude}, ${coursePlace.place.longitude})"
                                    style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; width: 100%;"
                                >
                                    지도에서 보기
                                </button>
                            </div>
                        `,
                    });

                    // 마커 클릭 이벤트
                    kakao.maps.event.addListener(marker, "click", function () {
                        infowindow.open(kakaoMap, marker);
                    });

                    newMarkers.push(marker);
                    bounds.extend(position);
                }
            });

            setMarkers(newMarkers);

            // 모든 마커가 보이도록 지도 범위 조정
            if (newMarkers.length > 0) {
                kakaoMap.setBounds(bounds);
            }
        };

        if (courseData) {
            loadKakaoMap();
        }
    }, [courseData]);

    // 현재 코스가 찜되어 있는지 확인
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            try {
                const token = localStorage.getItem("authToken");
                if (!token) return;

                const response = await fetch("/api/users/favorites", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const favorites = await response.json();
                    const isFavorited = favorites.some((fav: any) => fav.course_id.toString() === params.id);
                    setIsSaved(isFavorited);
                }
            } catch (error) {
                console.error("Error checking favorite status:", error);
            }
        };

        if (courseData) {
            checkFavoriteStatus();
        }
    }, [courseData, params.id]);

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                // 기본 코스 정보 먼저 가져오기
                const courseResponse = await fetch(`/api/courses/${params.id}`);
                if (!courseResponse.ok) {
                    throw new Error("Failed to fetch course");
                }
                const course = await courseResponse.json();

                // 추가 데이터들을 개별적으로 가져오기 (에러가 있어도 계속 진행)
                let highlights = [];
                let benefits = [];
                let notices = [];
                let contacts = [];
                let coursePlaces = [];

                try {
                    const highlightsResponse = await fetch(`/api/courses/${params.id}/highlights`);
                    if (highlightsResponse.ok) {
                        highlights = await highlightsResponse.json();
                    }
                } catch (err) {
                    console.warn("Failed to fetch highlights:", err);
                }

                try {
                    const benefitsResponse = await fetch(`/api/courses/${params.id}/benefits`);
                    if (benefitsResponse.ok) {
                        benefits = await benefitsResponse.json();
                    }
                } catch (err) {
                    console.warn("Failed to fetch benefits:", err);
                }

                try {
                    const noticesResponse = await fetch(`/api/courses/${params.id}/notices`);
                    if (noticesResponse.ok) {
                        notices = await noticesResponse.json();
                    }
                } catch (err) {
                    console.warn("Failed to fetch notices:", err);
                }

                try {
                    const contactsResponse = await fetch(`/api/courses/${params.id}/contacts`);
                    if (contactsResponse.ok) {
                        contacts = await contactsResponse.json();
                    }
                } catch (err) {
                    console.warn("Failed to fetch contacts:", err);
                }

                try {
                    const placesResponse = await fetch(`/api/courses/${params.id}/places`);
                    if (placesResponse.ok) {
                        coursePlaces = await placesResponse.json();
                    }
                } catch (err) {
                    console.warn("Failed to fetch places:", err);
                }

                setCourseData({
                    ...course,
                    highlights,
                    benefits,
                    notices,
                    contacts,
                    coursePlaces: coursePlaces.sort((a: CoursePlace, b: CoursePlace) => a.order_index - b.order_index),
                });
            } catch (err) {
                console.error("Error fetching course data:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchCourseData();
        }
    }, [params.id]);

    const handleSaveCourse = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                alert("로그인이 필요합니다.");
                router.push("/login");
                return;
            }

            if (isSaved) {
                // 찜 삭제
                const response = await fetch(`/api/users/favorites?courseId=${params.id}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    setIsSaved(false);
                    alert("찜 목록에서 제거되었습니다.");
                } else {
                    alert("찜 삭제에 실패했습니다.");
                }
            } else {
                // 찜 추가
                const response = await fetch("/api/users/favorites", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ courseId: params.id }),
                });

                if (response.ok) {
                    setIsSaved(true);
                    alert("찜 목록에 추가되었습니다.");
                } else {
                    const errorData = await response.json();
                    if (errorData.error === "Already favorited") {
                        setIsSaved(true);
                        alert("이미 찜한 코스입니다.");
                    } else {
                        alert("찜 추가에 실패했습니다.");
                    }
                }
            }
        } catch (error) {
            console.error("Error handling favorite:", error);
            alert("오류가 발생했습니다.");
        }
    };

    const handleShareCourse = () => {
        if (navigator.share) {
            navigator.share({
                title: courseData?.title,
                text: courseData?.description,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("링크가 복사되었습니다.");
        }
    };

    const getTotalCost = () => {
        if (!courseData?.coursePlaces) return courseData?.price || "정보 없음";
        // 각 장소의 비용 범위를 합산해서 계산하는 로직 추가 가능
        return courseData.price;
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">코스 정보를 불러오는 중...</p>
                </div>
            </main>
        );
    }

    if (error || !courseData) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">코스를 찾을 수 없습니다</h1>
                    <p className="text-gray-600 mb-6">{error || "요청하신 코스가 존재하지 않습니다."}</p>
                    <button
                        onClick={() => router.push("/courses")}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                        코스 목록으로 돌아가기
                    </button>
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-black">
            {/* Hero Section */}
            <section className="relative h-96 overflow-hidden">
                <div className="absolute inset-0">
                    <img src={courseData.imageUrl} alt={courseData.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                </div>

                <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center">
                    <div className="max-w-2xl">
                        <div className="mb-4 flex items-center gap-3">
                            {courseData.isPopular && (
                                <span className="px-4 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full">
                                    🔥 인기 코스
                                </span>
                            )}
                            <span className="px-4 py-1.5 bg-blue-500 text-white text-sm font-bold rounded-full">
                                {courseData.concept}
                            </span>
                            <span className="px-4 py-1.5 bg-purple-500 text-white text-sm font-bold rounded-full">
                                {courseData.courseType}
                            </span>
                        </div>

                        <h1 className="text-5xl font-bold text-white mb-4">{courseData.title}</h1>
                        <p className="text-xl text-white/90 mb-6">{courseData.description}</p>

                        <div className="flex items-center gap-6 text-white">
                            <div className="flex items-center gap-2">
                                <span className="text-yellow-400 text-2xl">★</span>
                                <span className="font-bold text-lg">{courseData.rating}</span>
                            </div>
                            <span>📍 {courseData.coursePlaces?.length || 0}개 장소</span>
                            <span>⏱ {courseData.duration}</span>
                            <span>💰 {getTotalCost()}</span>
                            <span>🕒 {courseData.recommendedTime}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Course Details */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* 코스 설명 */}
                            <div className="bg-white rounded-2xl shadow-lg p-8">
                                <h2 className="text-3xl font-bold mb-6">코스 소개</h2>
                                <p className="text-gray-700 leading-relaxed text-lg">{courseData.description}</p>
                            </div>

                            {/* 코스 특징 */}
                            {courseData.highlights && courseData.highlights.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-lg p-8">
                                    <h2 className="text-3xl font-bold mb-6">코스 특징</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {courseData.highlights.map((highlight) => (
                                            <div
                                                key={highlight.id}
                                                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                                            >
                                                <span className="text-blue-500 text-2xl">{highlight.icon}</span>
                                                <div>
                                                    <h4 className="font-bold text-gray-800 mb-1">{highlight.title}</h4>
                                                    <p className="text-gray-600 text-sm">{highlight.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 타임라인 + 지도 섹션 */}
                            <div className="bg-white rounded-2xl shadow-lg p-8">
                                {/* 상단에 고정 지도 */}
                                <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
                                    <div className="relative">
                                        {/* 카카오맵 컨테이너 */}
                                        <div
                                            ref={mapRef}
                                            className="w-full h-80 rounded-2xl"
                                            style={{ minHeight: "320px" }}
                                        ></div>

                                        {/* 지도 위 오버레이 */}
                                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                                            <div className="text-sm font-medium text-gray-800">🗺️ 실시간 코스 지도</div>
                                            <div className="text-xs text-gray-600">
                                                각 장소를 클릭하면 상세 정보를 확인할 수 있어요
                                            </div>
                                        </div>

                                        {/* 지도 위 미니 컨트롤 */}
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    if (map && courseData?.coursePlaces) {
                                                        const kakao = (window as any).kakao;
                                                        const bounds = new kakao.maps.LatLngBounds();
                                                        courseData.coursePlaces.forEach((place) => {
                                                            if (place.place.latitude && place.place.longitude) {
                                                                bounds.extend(
                                                                    new kakao.maps.LatLng(
                                                                        place.place.latitude,
                                                                        place.place.longitude
                                                                    )
                                                                );
                                                            }
                                                        });
                                                        map.setBounds(bounds);
                                                    }
                                                }}
                                                className="bg-white/90 backdrop-blur-sm border-none text-gray-700 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-white transition-colors shadow-lg"
                                            >
                                                전체보기
                                            </button>
                                            <button className="bg-white/90 backdrop-blur-sm border-none text-gray-700 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-white transition-colors shadow-lg">
                                                길찾기
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 타임라인 */}
                                <div className="relative pl-10">
                                    {/* 타임라인 연결선 */}
                                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-pink-500"></div>

                                    {/* 타임라인 아이템들 */}
                                    {courseData.coursePlaces && courseData.coursePlaces.length > 0 ? (
                                        courseData.coursePlaces.map((coursePlace, index) => (
                                            <div key={coursePlace.id} className="relative mb-8">
                                                {/* 타임라인 점 */}
                                                <div className="absolute -left-8 top-6 w-4 h-4 bg-indigo-500 rounded-full border-4 border-white shadow-lg"></div>

                                                {/* 스텝 번호 */}
                                                <div className="absolute -left-12 top-4 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                                                    {coursePlace.order_index}
                                                </div>

                                                {/* 장소 카드 */}
                                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                                    <div className="flex gap-4">
                                                        {/* 장소 이미지 */}
                                                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                                            {coursePlace.place.image_url ? (
                                                                <img
                                                                    src={coursePlace.place.image_url}
                                                                    alt={coursePlace.place.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-2xl">📍</span>
                                                            )}
                                                        </div>

                                                        {/* 장소 정보 */}
                                                        <div className="flex-1">
                                                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                                                {coursePlace.place.name}
                                                            </h3>
                                                            <div className="text-blue-600 text-sm font-medium mb-3">
                                                                {coursePlace.place.category}
                                                            </div>
                                                            <div className="flex gap-4 text-sm text-gray-600 mb-2">
                                                                <span>⭐ {coursePlace.place.avg_cost_range}</span>
                                                                <span>💰 {coursePlace.estimated_duration}분</span>
                                                                <span>📍 {coursePlace.recommended_time}</span>
                                                            </div>
                                                            <div className="text-sm text-gray-500 mb-4">
                                                                <p className="mb-1">{coursePlace.place.address}</p>
                                                                {coursePlace.place.opening_hours && (
                                                                    <p>🕒 {coursePlace.place.opening_hours}</p>
                                                                )}
                                                                {coursePlace.place.phone && (
                                                                    <p>📞 {coursePlace.place.phone}</p>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        if (
                                                                            map &&
                                                                            coursePlace.place.latitude &&
                                                                            coursePlace.place.longitude
                                                                        ) {
                                                                            const kakao = (window as any).kakao;
                                                                            const position = new kakao.maps.LatLng(
                                                                                coursePlace.place.latitude,
                                                                                coursePlace.place.longitude
                                                                            );
                                                                            map.setCenter(position);
                                                                            map.setLevel(3);
                                                                        }
                                                                    }}
                                                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors cursor-pointer"
                                                                >
                                                                    지도에서 보기
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (
                                                                            coursePlace.place.latitude &&
                                                                            coursePlace.place.longitude
                                                                        ) {
                                                                            const url = `https://map.kakao.com/link/to/${coursePlace.place.name},${coursePlace.place.latitude},${coursePlace.place.longitude}`;
                                                                            window.open(url, "_blank");
                                                                        }
                                                                    }}
                                                                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                                                                >
                                                                    길찾기
                                                                </button>
                                                                {coursePlace.place.phone && (
                                                                    <button
                                                                        onClick={() =>
                                                                            window.open(
                                                                                `tel:${coursePlace.place.phone}`,
                                                                                "_self"
                                                                            )
                                                                        }
                                                                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                                                                    >
                                                                        전화걸기
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>등록된 장소가 없습니다.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 혜택 및 준비물 */}
                            {courseData.benefits && courseData.benefits.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-lg p-8">
                                    <h2 className="text-3xl font-bold mb-6">혜택 및 준비물</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {courseData.benefits.map((benefit) => (
                                            <div
                                                key={benefit.id}
                                                className="flex items-center gap-3 p-4 bg-green-50 rounded-lg"
                                            >
                                                <span className="text-green-500 text-xl">✓</span>
                                                <span className="text-gray-700 font-medium">
                                                    {benefit.benefit_text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 참고사항 */}
                            {courseData.notices && courseData.notices.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-lg p-8">
                                    <h2 className="text-3xl font-bold mb-6">참고사항</h2>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                        <ul className="space-y-2">
                                            {courseData.notices.map((notice) => (
                                                <li key={notice.id} className="flex items-start gap-2">
                                                    <span className="text-blue-600 mt-1">•</span>
                                                    <span className="text-gray-700">{notice.notice_text}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-6 space-y-6">
                                {/* 코스 액션 카드 */}
                                <div className="bg-white rounded-2xl shadow-lg p-6">
                                    <h3 className="text-xl font-bold mb-4">이 코스</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">장소 수</span>
                                            <span className="font-semibold">
                                                {courseData.coursePlaces?.length || 0}개
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">평점</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-yellow-400">★</span>
                                                <span className="font-semibold">{courseData.rating}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">예상 비용</span>
                                            <span className="font-semibold text-lg text-blue-600">
                                                {getTotalCost()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">소요시간</span>
                                            <span className="font-semibold">{courseData.duration}</span>
                                        </div>
                                        <div className="border-t pt-4 space-y-3">
                                            <button
                                                onClick={handleSaveCourse}
                                                className={`w-full py-3 font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                                                    isSaved
                                                        ? "bg-red-500 text-white hover:bg-red-600"
                                                        : "bg-pink-500 text-white hover:bg-pink-600"
                                                }`}
                                            >
                                                {isSaved ? "💖 찜 완료" : "🤍 찜하기"}
                                            </button>
                                            <button
                                                onClick={handleShareCourse}
                                                className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-all duration-300 cursor-pointer"
                                            >
                                                📤 공유하기
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 코스 정보 */}
                                <div className="bg-white rounded-2xl shadow-lg p-6">
                                    <h3 className="text-xl font-bold mb-4">코스 정보</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-purple-500">👫</span>
                                            <span className="font-medium">{courseData.courseType}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-orange-500">🕒</span>
                                            <span className="font-medium">{courseData.recommendedTime}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-green-500">🌸</span>
                                            <span className="font-medium">{courseData.season}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 교통 정보 */}
                                <div className="bg-white rounded-2xl shadow-lg p-6">
                                    <h3 className="text-xl font-bold mb-4">교통 정보</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className="text-blue-500 text-xl mt-1">🚗</span>
                                            <div className="flex-1">
                                                <p className="text-gray-700 font-medium">교통편</p>
                                                <p className="text-gray-600 text-sm">{courseData.transportation}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="text-green-500 text-xl mt-1">🅿️</span>
                                            <div className="flex-1">
                                                <p className="text-gray-700 font-medium">주차</p>
                                                <p className="text-gray-600 text-sm">{courseData.parking}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 연락처 정보 */}
                                {courseData.contacts && courseData.contacts.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-lg p-6">
                                        <h3 className="text-xl font-bold mb-4">문의하기</h3>
                                        <div className="space-y-3">
                                            {courseData.contacts.map((contact) => (
                                                <div key={contact.id} className="flex items-start gap-3">
                                                    <span className="text-blue-500 text-xl mt-1">{contact.icon}</span>
                                                    <div className="flex-1">
                                                        <p className="text-gray-700 font-medium">{contact.label}</p>
                                                        <p className="text-gray-600 text-sm">{contact.value}</p>
                                                        <p className="text-gray-500 text-xs">{contact.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
