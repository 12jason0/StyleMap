// src/components/Header.tsx

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const Header = () => {
    // ... (컴포넌트의 나머지 로직은 그대로 유지) ...
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [panelRight, setPanelRight] = useState(0);
    const [panelWidth, setPanelWidth] = useState(0);
    const [drawerWidth, setDrawerWidth] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [hasFavorites, setHasFavorites] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
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

        const token = localStorage.getItem("authToken");
        setIsLoggedIn(!!token);
        if (token) {
            fetchFavoritesSummary();
            checkLoginStatus();
        }

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "authToken") {
                setIsLoggedIn(!!e.newValue);
            }
        };

        const handleCustomStorageChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const token = customEvent.detail?.token || localStorage.getItem("authToken");
            setIsLoggedIn(!!token);
            if (token) {
                fetchFavoritesSummary();
            } else {
                setHasFavorites(false);
            }
        };

        const handleFavoritesChanged = () => {
            fetchFavoritesSummary();
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("authTokenChange", handleCustomStorageChange as EventListener);
        window.addEventListener("favoritesChanged", handleFavoritesChanged);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("authTokenChange", handleCustomStorageChange as EventListener);
            window.removeEventListener("favoritesChanged", handleFavoritesChanged);
        };
    }, []);

    // 메뉴 패널 기준을 main 우측 가장자리로 고정
    const recomputeAnchor = () => {
        try {
            const mainEl = document.querySelector("main");
            if (!mainEl) return;
            const rect = (mainEl as HTMLElement).getBoundingClientRect();
            const rightOffset = Math.max(0, window.innerWidth - rect.right);
            setPanelRight(rightOffset);
            setPanelWidth(rect.width);
            setDrawerWidth(Math.min(333, rect.width));
        } catch {}
    };

    useEffect(() => {
        recomputeAnchor();
        window.addEventListener("resize", recomputeAnchor);
        return () => window.removeEventListener("resize", recomputeAnchor);
    }, [pathname]);

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

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    // 메뉴가 열릴 때 전체 페이지 스크롤을 잠그고, 닫히면 복원
    useEffect(() => {
        if (isMenuOpen) {
            const previousOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = previousOverflow;
            };
        } else {
            document.body.style.overflow = "";
        }
    }, [isMenuOpen]);

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            localStorage.removeItem("loginTime");
        } catch (error) {
            console.error("로그아웃 처리 중 오류 발생:", error);
        }
        setIsLoggedIn(false);
        setHasFavorites(false);
        window.dispatchEvent(new CustomEvent("authTokenChange"));
        closeMenu();
        router.push("/");
        alert("로그아웃되었습니다.");
    };

    const openLogoutConfirm = () => setShowLogoutConfirm(true);
    const closeLogoutConfirm = () => setShowLogoutConfirm(false);

    return (
        // [수정] fixed 속성을 relative로 변경하고 그림자(shadow-sm)를 추가합니다.
        <header className="relative z-50 bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* 로고 */}
                    <Link href="/" className="flex items-center space-x-2" onClick={closeMenu}>
                        <img
                            src="https://stylemap-images.s3.ap-southeast-2.amazonaws.com/logoicon-navy.png"
                            alt="StyleMap"
                            className="w-8 h-8 rounded-lg object-contain"
                        />
                        <span className="text-xl font-bold text-gray-900">StyleMap</span>
                    </Link>

                    {/* 모바일 스타일 헤더를 웹에서도 동일하게 사용 */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() =>
                                router.push(localStorage.getItem("authToken") ? "/mypage?tab=favorites" : "/login")
                            }
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

            {/* 앱 스타일 오프캔버스 메뉴 (왼쪽에서 슬라이드) */}
            <div>
                {isMenuOpen && (
                    <div
                        className="fixed top-16 bottom-0 z-40 bg-black/30"
                        style={{ right: panelRight, width: panelWidth }}
                        onClick={closeMenu}
                    />
                )}
                <div
                    className={`fixed top-16 bottom-0 z-50 bg-white border-l border-gray-200 shadow-2xl transform transition-all ease-in-out duration-300 flex flex-col ${
                        isMenuOpen
                            ? "translate-x-0 opacity-100 pointer-events-auto"
                            : "translate-x-full opacity-0 pointer-events-none"
                    }`}
                    aria-hidden={!isMenuOpen}
                    onClick={(e) => e.stopPropagation()}
                    style={{ right: panelRight, width: Math.max(240, drawerWidth) }}
                >
                    <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-2">
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
