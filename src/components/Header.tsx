"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
// 상단 import 하단의 컴포넌트 시작부에 추가

const Header = () => {
    // AI 추천 드롭다운 제거
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [hasFavorites, setHasFavorites] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

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

    // 드롭다운 제거로 외부 클릭 핸들러 삭제

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    // --- ⬇️ 여기가 수정된 부분입니다 ⬇️ ---
    // 로그아웃 함수
    const handleLogout = async () => {
        try {
            // 서버에 로그아웃 요청을 보내 httpOnly 쿠키를 삭제합니다.
            await fetch("/api/auth/logout", { method: "POST" });

            // 브라우저의 localStorage에 저장된 정보도 삭제합니다.
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            localStorage.removeItem("loginTime");
        } catch (error) {
            console.error("로그아웃 처리 중 오류 발생:", error);
        }

        // 화면의 상태를 로그아웃으로 변경하고 홈으로 이동합니다.
        setIsLoggedIn(false);
        setHasFavorites(false); // 찜 상태도 초기화
        window.dispatchEvent(new CustomEvent("authTokenChange"));
        closeMenu();
        router.push("/");
        alert("로그아웃되었습니다.");
    };
    // --- ⬆️ 여기까지 수정되었습니다 ⬆️ ---

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
                            src="https://stylemap-images.s3.ap-southeast-2.amazonaws.com/logoicon-navy.png"
                            alt="StyleMap"
                            className="w-8 h-8 rounded-lg object-contain"
                        />
                        <span className="text-xl font-bold text-gray-900">StyleMap</span>
                    </Link>

                    {/* 데스크톱 네비게이션 (웹: 기존 가로 메뉴 유지) */}
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
                            href="/nearby"
                            className={`text-sm font-medium transition-colors ${
                                pathname === "/nearby" ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                            }`}
                        >
                            오늘 뭐하지?
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
                        <Link
                            href="/escape"
                            className={`text-sm font-medium transition-colors ${
                                pathname === "/escape" ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                            }`}
                        >
                            사건 파일
                        </Link>

                        {/* 팝업 메뉴 제거 */}
                    </nav>

                    {/* 데스크톱: 우측 햄버거 버튼 제거(웹은 가로 메뉴 유지) */}
                    <div className="hidden md:hidden items-center gap-3">
                        <button
                            onClick={toggleMenu}
                            className="p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            aria-label="메뉴 열기"
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

            {/* 상단 드롭다운 형태의 모바일 메뉴는 제거됨 */}

            {/* 앱(모바일 전용) 오프캔버스 메뉴 (오른쪽 → 왼쪽, 화면 절반) */}
            <div className="md:hidden">
                {/* 헤더 아래부터 전체 오버레이 */}
                {isMenuOpen && (
                    <div className="fixed left-0 right-0 top-16 bottom-0 z-40 bg-black/30" onClick={closeMenu} />
                )}
                <div
                    className={`fixed top-16 right-0 bottom-0 z-50 w-1/2 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ${
                        isMenuOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 space-y-2">
                        {/* 하단 유틸 섹션: 서비스 소개, 이용안내 (아이콘 포함) */}
                        <div className="pt-4 mt-2 border-t border-gray-200 grid grid-cols-2 gap-3">
                            <Link
                                href="/about"
                                onClick={closeMenu}
                                className="flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100"
                            >
                                <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
                                    <svg
                                        className="w-5 h-5 text-gray-700"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M12 20l9-5-9-5-9 5 9 5z" />
                                        <path d="M12 12l9-5-9-5-9 5 9 5z" />
                                    </svg>
                                </span>
                                <span className="text-sm font-semibold text-gray-800">서비스 소개</span>
                            </Link>
                            <Link
                                href="/help"
                                onClick={closeMenu}
                                className="flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100"
                            >
                                <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
                                    <svg
                                        className="w-5 h-5 text-gray-700"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M11 10h2v6h-2z" />
                                        <path d="M12 6h.01" />
                                    </svg>
                                </span>
                                <span className="text-sm font-semibold text-gray-800">이용안내</span>
                            </Link>
                        </div>

                        <Link
                            href="/"
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            onClick={closeMenu}
                        >
                            홈
                        </Link>
                        <Link
                            href="/courses"
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            onClick={closeMenu}
                        >
                            코스
                        </Link>
                        <Link
                            href="/nearby"
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            onClick={closeMenu}
                        >
                            오늘 뭐하지?
                        </Link>
                        <Link
                            href="/personalized-home"
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            onClick={closeMenu}
                        >
                            🎯 AI 추천
                        </Link>
                        <Link
                            href="/map"
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            onClick={closeMenu}
                        >
                            지도
                        </Link>
                        <Link
                            href="/escape"
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            onClick={closeMenu}
                        >
                            사건 파일
                        </Link>

                        <div className="pt-4 mt-2 border-t border-gray-200">
                            {isLoggedIn ? (
                                <>
                                    <Link
                                        href="/mypage"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                        onClick={closeMenu}
                                    >
                                        마이페이지
                                    </Link>
                                    <button
                                        onClick={openLogoutConfirm}
                                        className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        로그아웃
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                        onClick={closeMenu}
                                    >
                                        로그인
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                        onClick={closeMenu}
                                    >
                                        회원가입
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 모바일 하단 탭 바 제거됨 */}
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
