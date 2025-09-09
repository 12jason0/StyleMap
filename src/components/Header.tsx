"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
// 상단 import 하단의 컴포넌트 시작부에 추가

const Header = () => {
    const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [hasFavorites, setHasFavorites] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const aiMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // JWT 토큰 유효성 검증 함수
        const checkLoginStatus = async () => {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setIsLoggedIn(false);
                setHasFavorites(false);
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
                    // 로그인 유효 시 찜 상태 동기화
                    fetchFavoritesSummary();
                } else {
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("user");
                    setIsLoggedIn(false);
                    setHasFavorites(false);
                }
            } catch (error) {
                console.error("토큰 검증 오류:", error);
                localStorage.removeItem("authToken");
                localStorage.removeItem("user");
                setIsLoggedIn(false);
                setHasFavorites(false);
            }
        };

        // 초기 로그인 상태 확인 - 즉시 localStorage에서 확인
        const token = localStorage.getItem("authToken");
        setIsLoggedIn(!!token);
        if (token) {
            fetchFavoritesSummary();
        }

        // 백그라운드에서 토큰 유효성 검증
        if (token) {
            checkLoginStatus();
        }

        // localStorage 변경 감지를 위한 이벤트 리스너
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "authToken") {
                if (e.newValue) {
                    setIsLoggedIn(true);
                } else {
                    setIsLoggedIn(false);
                }
            }
        };

        // 커스텀 이벤트 리스너 (같은 탭에서의 변경 감지)
        const handleCustomStorageChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            console.log("Header: authTokenChange event received, detail:", customEvent.detail);

            // 이벤트에서 토큰을 받아오거나, localStorage에서 직접 확인
            const token = customEvent.detail?.token || localStorage.getItem("authToken");
            console.log("Header: 최종 토큰 확인:", !!token, token ? token.substring(0, 20) + "..." : "없음");

            setIsLoggedIn(!!token);
            if (token) {
                fetchFavoritesSummary();
            } else {
                setHasFavorites(false);
            }
        };

        // 찜 변경 전역 이벤트 리스너
        const handleFavoritesChanged = () => {
            fetchFavoritesSummary();
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("authTokenChange", handleCustomStorageChange);
        window.addEventListener("favoritesChanged", handleFavoritesChanged);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("authTokenChange", handleCustomStorageChange);
            window.removeEventListener("favoritesChanged", handleFavoritesChanged);
        };
    }, []);

    // 사용자의 찜 유무만 빠르게 요약 조회
    const fetchFavoritesSummary = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setHasFavorites(false);
                return;
            }
            const res = await fetch("/api/users/favorites", {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            if (res.ok) {
                const favorites = await res.json();
                setHasFavorites(Array.isArray(favorites) && favorites.length > 0);
            } else {
                setHasFavorites(false);
            }
        } catch (e) {
            console.error("Failed to fetch favorites summary", e);
            setHasFavorites(false);
        }
    };

    // AI 추천 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (aiMenuRef.current && !aiMenuRef.current.contains(event.target as Node)) {
                setIsAiMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
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
        try {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            localStorage.removeItem("loginTime");
        } catch {}

        setIsLoggedIn(false);
        window.dispatchEvent(new CustomEvent("authTokenChange"));
        closeMenu();
        router.push("/");
        alert("로그아웃되었습니다.");
    };
    const openLogoutConfirm = () => {
        setShowLogoutConfirm(true);
    };
    const closeLogoutConfirm = () => {
        setShowLogoutConfirm(false);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* 로고 */}
                    <Link href="/" className="flex items-center space-x-2" onClick={closeMenu}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://stylemap-images.s3.ap-southeast-2.amazonaws.com/logo.png"
                            alt="StyleMap"
                            className="w-8 h-8 rounded-lg object-contain"
                        />
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
                        <div className="relative" ref={aiMenuRef}>
                            <button
                                onClick={() => setIsAiMenuOpen((v) => !v)}
                                className={`hover:cursor-pointer text-sm font-medium transition-colors ${
                                    pathname === "/personalized-home" || pathname === "/nearby"
                                        ? "text-blue-600"
                                        : "text-gray-700 hover:text-blue-600"
                                }`}
                            >
                                🎯 AI 추천
                            </button>
                            {isAiMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 hover:cursor-pointer">
                                    <Link
                                        href="/personalized-home"
                                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                                        onClick={() => setIsAiMenuOpen(false)}
                                    >
                                        맞춤형 추천
                                    </Link>
                                    <Link
                                        href="/nearby"
                                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 "
                                        onClick={() => setIsAiMenuOpen(false)}
                                    >
                                        실시간 주변 추천
                                    </Link>
                                </div>
                            )}
                        </div>

                        <Link
                            href="/map"
                            className={`text-sm font-medium transition-colors ${
                                pathname === "/map" ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                            }`}
                        >
                            지도
                        </Link>
                        <Link
                            href="/tag-courses"
                            className={`text-sm font-medium transition-colors ${
                                pathname === "/tag-courses" ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                            }`}
                        >
                            태그 코스
                        </Link>
                        {/* 팝업 메뉴 제거 */}
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
                                    onClick={openLogoutConfirm}
                                    className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors active:scale-95 transform hover:cursor-pointer"
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

                    {/* 모바일: 찜 버튼 + 햄버거 버튼 */}
                    <div className="md:hidden flex items-center gap-2">
                        {/* 찜 버튼 (햄버거 왼쪽) */}
                        <button
                            onClick={() => {
                                const token = localStorage.getItem("authToken");
                                if (token) {
                                    router.push("/mypage?tab=favorites");
                                } else {
                                    router.push("/login");
                                }
                            }}
                            className={`p-2 rounded-md transition-colors cursor-pointer ${
                                hasFavorites
                                    ? "text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                                    : "text-gray-400 hover:text-pink-600 hover:bg-pink-50"
                            }`}
                            aria-label="찜 목록"
                            title="찜 목록"
                        >
                            <svg
                                className="w-6 h-6"
                                viewBox="0 0 24 24"
                                fill={hasFavorites ? "currentColor" : "none"}
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M12 21s-6.716-4.223-9.193-7.246C1.087 11.85 1 9.49 2.343 7.9 3.685 6.31 5.89 6.02 7.5 7.2 8.55 7.98 9.19 9.2 12 11.5c2.81-2.3 3.45-3.52 4.5-4.3 1.61-1.18 3.815-.89 5.157.7 1.343 1.59 1.256 3.95-.464 5.854C18.716 16.777 12 21 12 21z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                            </svg>
                        </button>

                        {/* 햄버거 버튼 */}
                        <button
                            onClick={toggleMenu}
                            className="p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            aria-label="메뉴"
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
                            🎯 AI 추천 - 맞춤형
                        </Link>
                        <Link
                            href="/nearby"
                            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                pathname === "/nearby"
                                    ? "text-blue-600 bg-blue-50"
                                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            }`}
                            onClick={closeMenu}
                        >
                            🎯 AI 추천 - 주변
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
                        <Link
                            href="/tag-courses"
                            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                pathname === "/tag-courses"
                                    ? "text-blue-600 bg-blue-50"
                                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            }`}
                            onClick={closeMenu}
                        >
                            태그 코스
                        </Link>
                        {/* 팝업 메뉴 제거 */}

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
                                        onClick={openLogoutConfirm}
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
            <div
                className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg"
                style={{ bottom: 0 }}
            >
                <div className="grid grid-cols-5 gap-1 p-2">
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
                        <span className="text-xs font-medium">홈</span>
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
                        <span className="text-xs font-medium">코스</span>
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
                        <span className="text-xs font-medium">AI 추천</span>
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
                        <span className="text-xs font-medium">지도</span>
                    </Link>
                    {/* 팝업 탭 제거 */}
                    {isLoggedIn ? (
                        <button
                            onClick={openLogoutConfirm}
                            className="flex flex-col items-center py-2 px-1 rounded-lg transition-colors text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            <span className="text-xs font-medium">로그아웃</span>
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="flex flex-col items-center py-2 px-1 rounded-lg transition-colors text-gray-600 hover:text-blue-600"
                            onClick={closeMenu}
                        >
                            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                                />
                            </svg>
                            <span className="text-xs font-medium">로그인</span>
                        </Link>
                    )}
                </div>
            </div>
            {/* 로그아웃 확인 모달 */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">로그아웃</h3>
                        <p className="text-gray-600 mb-6">로그아웃 하시겠습니까?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={closeLogoutConfirm}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    closeLogoutConfirm();
                                    handleLogout();
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                            >
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
