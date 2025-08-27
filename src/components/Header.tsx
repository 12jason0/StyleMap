"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function Header() {
    const [currentLocation, setCurrentLocation] = useState<string>("위치 확인 중");
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // 스크롤 시 헤더 스타일 변경
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // 현재 위치 가져오기
    useEffect(() => {
        const getLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        try {
                            // 카카오 역지오코딩으로 동네 이름 가져오기
                            if (window.kakao?.maps?.services) {
                                const geocoder = new window.kakao.maps.services.Geocoder();
                                geocoder.coord2RegionCode(
                                    position.coords.longitude,
                                    position.coords.latitude,
                                    (result: any[], status: string) => {
                                        if (status === window.kakao.maps.services.Status.OK) {
                                            const dong =
                                                result[0]?.region_3depth_name ||
                                                result[0]?.region_2depth_name ||
                                                "위치 확인됨";
                                            setCurrentLocation(dong);
                                        } else {
                                            setCurrentLocation("서울");
                                        }
                                    }
                                );
                            } else {
                                // 카카오맵 API가 로드되지 않은 경우 기본 위치 설정
                                setCurrentLocation("서울");
                            }
                        } catch (error) {
                            console.error("위치 정보 가져오기 실패:", error);
                            setCurrentLocation("서울");
                        }
                    },
                    (error) => {
                        console.error("위치 권한 거부 또는 오류:", error);
                        setCurrentLocation("서울");
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000,
                    }
                );
            } else {
                setCurrentLocation("서울");
            }
        };

        // 카카오맵 API 로드 확인 후 위치 가져오기
        if (window.kakao?.maps?.services) {
            getLocation();
        } else {
            // API 로드 대기
            const checkKakaoAPI = setInterval(() => {
                if (window.kakao?.maps?.services) {
                    clearInterval(checkKakaoAPI);
                    getLocation();
                }
            }, 100);

            // 5초 후 타임아웃
            setTimeout(() => {
                clearInterval(checkKakaoAPI);
                if (currentLocation === "위치 확인 중") {
                    setCurrentLocation("서울");
                }
            }, 5000);
        }
    }, [currentLocation]);

    const isActive = (path: string) => pathname === path;

    return (
        <>
            {/* 데스크탑 헤더 */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    isScrolled ? "bg-white shadow-md" : "bg-white/95 backdrop-blur-sm"
                }`}
            >
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16 w-full">
                        {/* 왼쪽: 로고 */}
                        <div className="flex-shrink-0">
                            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition">
                                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
                                    StyleMap
                                </span>
                            </Link>
                        </div>

                        {/* 중앙: 메인 네비게이션 */}
                        <nav className="hidden md:flex items-center space-x-1 absolute left-1/2 transform -translate-x-1/2">
                            <Link
                                href="/courses"
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    isActive("/courses") ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                코스 찾기
                            </Link>
                            <Link
                                href="/my-courses"
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    isActive("/my-courses")
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                내 코스
                            </Link>
                            <Link
                                href="/map"
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all relative ${
                                    isActive("/map") ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                실시간
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            </Link>
                        </nav>

                        {/* 오른쪽: 위치 및 버튼 */}
                        <div className="flex items-center space-x-4 flex-shrink-0">
                            {/* 현재 위치 */}
                            <button
                                onClick={() => router.push(`/courses?location=${currentLocation}`)}
                                className="hidden md:flex items-center space-x-1 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition"
                            >
                                <span className="text-sm">📍</span>
                                <span className="text-sm text-gray-700">{currentLocation}</span>
                            </button>

                            {/* 로그인/프로필 */}
                            <button
                                onClick={() => router.push("/login")}
                                className="hidden md:block px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-sky-500 rounded-full hover:shadow-lg transition-all"
                            >
                                시작하기
                            </button>

                            {/* 모바일 메뉴 버튼 */}
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2">
                                <div className="space-y-1">
                                    <div
                                        className={`w-6 h-0.5 bg-gray-700 transition-all ${
                                            isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""
                                        }`}
                                    />
                                    <div
                                        className={`w-6 h-0.5 bg-gray-700 transition-all ${
                                            isMobileMenuOpen ? "opacity-0" : ""
                                        }`}
                                    />
                                    <div
                                        className={`w-6 h-0.5 bg-gray-700 transition-all ${
                                            isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                                        }`}
                                    />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* 모바일 메뉴 */}
            <div
                className={`fixed inset-x-0 top-16 bg-white shadow-lg z-40 md:hidden transition-all duration-300 ${
                    isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
                }`}
            >
                <div className="px-4 py-4 space-y-2">
                    <Link
                        href="/courses"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block px-4 py-3 rounded-lg text-base font-medium ${
                            isActive("/courses") ? "bg-blue-50 text-blue-700" : "text-gray-700"
                        }`}
                    >
                        코스 찾기
                    </Link>
                    <Link
                        href="/my-courses"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block px-4 py-3 rounded-lg text-base font-medium ${
                            isActive("/my-courses") ? "bg-blue-50 text-blue-700" : "text-gray-700"
                        }`}
                    >
                        내 코스
                    </Link>
                    <Link
                        href="/map"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block px-4 py-3 rounded-lg text-base font-medium ${
                            isActive("/map") ? "bg-blue-50 text-blue-700" : "text-gray-700"
                        }`}
                    >
                        실시간 지도
                    </Link>
                    <div className="pt-2 border-t">
                        <div className="px-4 py-2 text-sm text-gray-500">📍 {currentLocation}</div>
                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                router.push("/login");
                            }}
                            className="w-full mt-2 px-4 py-3 text-center font-medium text-white bg-gradient-to-r from-blue-600 to-sky-500 rounded-lg"
                        >
                            시작하기
                        </button>
                    </div>
                </div>
            </div>

            {/* 모바일 하단 탭바 */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-40">
                <div className="grid grid-cols-3 h-16">
                    <Link
                        href="/courses"
                        className={`flex flex-col items-center justify-center space-y-1 ${
                            isActive("/courses") ? "text-blue-600" : "text-gray-500"
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                            />
                        </svg>
                        <span className="text-xs">코스</span>
                    </Link>
                    <Link
                        href="/map"
                        className={`flex flex-col items-center justify-center space-y-1 ${
                            isActive("/map") ? "text-blue-600" : "text-gray-500"
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        <span className="text-xs">실시간</span>
                    </Link>
                    <Link
                        href="/my-courses"
                        className={`flex flex-col items-center justify-center space-y-1 ${
                            isActive("/my-courses") ? "text-blue-600" : "text-gray-500"
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                        </svg>
                        <span className="text-xs">내 코스</span>
                    </Link>
                </div>
            </nav>

            {/* 헤더 높이만큼 여백 */}
            <div className="h-10 bg-white" />
        </>
    );
}
