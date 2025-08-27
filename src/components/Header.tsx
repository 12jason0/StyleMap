"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        // JWT 토큰 유효성 검증
        const checkLoginStatus = async () => {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setIsLoggedIn(false);
                return;
            }

            try {
                const response = await fetch("/api/auth/verify", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    setIsLoggedIn(true);
                } else {
                    localStorage.removeItem("authToken");
                    setIsLoggedIn(false);
                }
            } catch (error) {
                console.error("토큰 검증 오류:", error);
                localStorage.removeItem("authToken");
                setIsLoggedIn(false);
            }
        };

        checkLoginStatus();

        // localStorage 변경 감지를 위한 이벤트 리스너
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "authToken") {
                checkLoginStatus();
            }
        };

        // 커스텀 이벤트 리스너 (같은 탭에서의 변경 감지)
        const handleCustomStorageChange = () => {
            checkLoginStatus();
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("authTokenChange", handleCustomStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("authTokenChange", handleCustomStorageChange);
        };
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    // 로그아웃 함수
    const handleLogout = () => {
        // 로컬 스토리지에서 토큰 제거
        localStorage.removeItem("authToken");

        // 로그인 상태 업데이트
        setIsLoggedIn(false);

        // 커스텀 이벤트 발생 (다른 컴포넌트에서 로그아웃 감지)
        window.dispatchEvent(new CustomEvent("authTokenChange"));

        // 홈페이지로 리다이렉트
        router.push("/");

        // 로그아웃 완료 메시지
        alert("로그아웃되었습니다.");

        // 모바일 메뉴 닫기
        closeMenu();
    };

    return (
        <header
            className={` fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg" : "bg-white"
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* 로고 */}
                    <Link href="/" className="flex items-center space-x-2" onClick={closeMenu}>
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">S</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">StyleMap</span>
                    </Link>

                    {/* 데스크톱 네비게이션 */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <Link
                            href="/"
                            className={`text-sm font-medium transition-colors ${
                                pathname === "/" ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                            }`}
                        >
                            홈
                        </Link>
                        <Link
                            href="/courses"
                            className={`text-sm font-medium transition-colors ${
                                pathname === "/courses" ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                            }`}
                        >
                            코스
                        </Link>
                        <Link
                            href="/personalized-home"
                            className={`text-sm font-medium transition-colors ${
                                pathname === "/personalized-home"
                                    ? "text-blue-600"
                                    : "text-gray-700 hover:text-blue-600"
                            }`}
                        >
                            🎯 AI 추천
                        </Link>

                        <Link
                            href="/map"
                            className={`text-sm font-medium transition-colors ${
                                pathname === "/map" ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                            }`}
                        >
                            지도
                        </Link>
                    </nav>

                    {/* 사용자 메뉴 */}
                    <div className="hidden md:flex items-center space-x-4">
                        {isLoggedIn ? (
                            <>
                                <Link
                                    href="/mypage"
                                    className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                    마이페이지
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors active:scale-95 transform"
                                >
                                    로그아웃
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                    로그인
                                </Link>
                                <Link
                                    href="/signup"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                                >
                                    회원가입
                                </Link>
                            </>
                        )}
                    </div>

                    {/* 모바일 메뉴 버튼 */}
                    <button
                        onClick={toggleMenu}
                        className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 모바일 메뉴 */}
            {isMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-200">
                    <div className="px-4 py-2 space-y-1">
                        <Link
                            href="/"
                            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                pathname === "/"
                                    ? "text-blue-600 bg-blue-50"
                                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            }`}
                            onClick={closeMenu}
                        >
                            홈
                        </Link>
                        <Link
                            href="/courses"
                            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                pathname === "/courses"
                                    ? "text-blue-600 bg-blue-50"
                                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            }`}
                            onClick={closeMenu}
                        >
                            코스
                        </Link>
                        <Link
                            href="/personalized-home"
                            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                pathname === "/personalized-home"
                                    ? "text-blue-600 bg-blue-50"
                                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            }`}
                            onClick={closeMenu}
                        >
                            🎯 AI 추천
                        </Link>
                        <Link
                            href="/map"
                            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                pathname === "/map"
                                    ? "text-blue-600 bg-blue-50"
                                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            }`}
                            onClick={closeMenu}
                        >
                            지도
                        </Link>

                        <div className="pt-4 pb-3 border-t border-gray-200">
                            {isLoggedIn ? (
                                <>
                                    <Link
                                        href="/mypage"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                        onClick={closeMenu}
                                    >
                                        마이페이지
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors active:scale-95 transform"
                                    >
                                        로그아웃
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                        onClick={closeMenu}
                                    >
                                        로그인
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                                        onClick={closeMenu}
                                    >
                                        회원가입
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 모바일 하단 탭 바 */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                <div className="grid grid-cols-4 gap-1 p-2">
                    <Link
                        href="/"
                        className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
                            pathname === "/" ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600"
                        }`}
                        onClick={closeMenu}
                    >
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        <span className="text-xs">홈</span>
                    </Link>
                    <Link
                        href="/courses"
                        className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
                            pathname === "/courses" ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600"
                        }`}
                        onClick={closeMenu}
                    >
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                        </svg>
                        <span className="text-xs">코스</span>
                    </Link>
                    <Link
                        href="/personalized-home"
                        className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
                            pathname === "/personalized-home"
                                ? "text-blue-600 bg-blue-50"
                                : "text-gray-600 hover:text-blue-600"
                        }`}
                        onClick={closeMenu}
                    >
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                        </svg>
                        <span className="text-xs">AI 추천</span>
                    </Link>
                    <Link
                        href="/map"
                        className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
                            pathname === "/map" ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600"
                        }`}
                        onClick={closeMenu}
                    >
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <span className="text-xs">지도</span>
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Header;
