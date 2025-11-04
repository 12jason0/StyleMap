// src/components/Header.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
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
    const [gardenUnlocked, setGardenUnlocked] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const menuButtonRef = useRef<HTMLButtonElement | null>(null);
    const drawerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const checkLoginStatus = async () => {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setIsLoggedIn(false);
                setHasFavorites(false);
                setGardenUnlocked(false);
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
                    // 즐겨찾기/정원 상태는 초기 페인트 이후로 지연
                    const idle = (cb: () => void) =>
                        "requestIdleCallback" in window
                            ? (window as any).requestIdleCallback(cb, { timeout: 2000 })
                            : setTimeout(cb, 500);
                    idle(() => {
                        fetchFavoritesSummary();
                        fetchGardenStatus();
                    });
                } else {
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("user");
                    setIsLoggedIn(false);
                    setHasFavorites(false);
                    setGardenUnlocked(false);
                }
            } catch (error) {
                console.error("토큰 검증 오류:", error);
                localStorage.removeItem("authToken");
                localStorage.removeItem("user");
                setIsLoggedIn(false);
                setHasFavorites(false);
                setGardenUnlocked(false);
            }
        };

        const token = localStorage.getItem("authToken");
        setIsLoggedIn(!!token);
        if (token) {
            // 초기 렌더 블로킹 방지: 모든 네트워크는 idle에 수행
            const idle = (cb: () => void) =>
                "requestIdleCallback" in window
                    ? (window as any).requestIdleCallback(cb, { timeout: 2000 })
                    : setTimeout(cb, 500);
            idle(() => {
                checkLoginStatus();
                fetchFavoritesSummary();
                fetchGardenStatus();
            });
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
                fetchGardenStatus();
            } else {
                setHasFavorites(false);
                setGardenUnlocked(false);
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
            const isMobile = window.innerWidth < 768;
            const mobileWidth = Math.round(rect.width * 0.5); // 모바일에서는 화면의 절반만
            const desktopWidth = Math.min(333, rect.width);
            setDrawerWidth(isMobile ? mobileWidth : desktopWidth);
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

    const fetchGardenStatus = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setGardenUnlocked(false);
                return;
            }
            const res = await fetch("/api/garden", {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                setGardenUnlocked(Boolean(data?.garden?.isUnlocked));
            } else {
                setGardenUnlocked(false);
            }
        } catch (e) {
            console.error("Failed to fetch garden status", e);
            setGardenUnlocked(false);
        }
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    // 메뉴가 열릴 때: 페이지 스크롤 잠그되, 드로어 내부는 스크롤 가능하도록 유지
    useEffect(() => {
        const mainEl = document.querySelector("main") as HTMLElement | null;
        if (!mainEl) return;
        if (isMenuOpen) {
            const prevOverflow = document.body.style.overflow;
            const prevMainOverflow = mainEl.style.overflow;
            document.body.style.overflow = "hidden";
            mainEl.style.overflow = "hidden"; // 배경 스크롤 잠금
            return () => {
                document.body.style.overflow = prevOverflow;
                mainEl.style.overflow = prevMainOverflow;
            };
        } else {
            document.body.style.overflow = "";
            mainEl.style.overflow = "";
        }
    }, [isMenuOpen]);

    // 접근성: 드로어 열림/닫힘 시 inert 적용 및 포커스 이동 처리
    useEffect(() => {
        const drawerEl = drawerRef.current;
        if (!drawerEl) return;

        if (isMenuOpen) {
            try {
                drawerEl.removeAttribute("inert");
            } catch {}
            // 드로어가 열릴 때 첫 번째 포커스 가능한 요소로 포커스 이동
            setTimeout(() => {
                try {
                    const firstFocusable = drawerEl.querySelector(
                        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    ) as HTMLElement | null;
                    firstFocusable?.focus();
                } catch {}
            }, 0);
        } else {
            // 닫힐 때 드로어 내부에 포커스가 남아있다면 해제하고 토글 버튼으로 포커스 복귀
            try {
                const active = document.activeElement as HTMLElement | null;
                if (active && drawerEl.contains(active)) {
                    active.blur();
                }
            } catch {}
            try {
                drawerEl.setAttribute("inert", "");
            } catch {}
            setTimeout(() => {
                try {
                    menuButtonRef.current?.focus();
                } catch {}
            }, 0);
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
    };

    const openLogoutConfirm = () => {
        try {
            setIsMenuOpen(false);
        } catch {}
        setShowLogoutConfirm(true);
    };
    const closeLogoutConfirm = () => setShowLogoutConfirm(false);

    return (
        // [수정] fixed 속성을 relative로 변경하고 그림자(shadow-sm)를 추가합니다.
        <header className="relative z-50 bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* 로고 */}
                    <Link href="/" className="flex items-center space-x-2" onClick={closeMenu}>
                        <span className="text-xl font-bold text-gray-900">DoNa</span>
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
                            ref={menuButtonRef}
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
                        className="fixed top-16 bottom-0 z-[1400] bg-black/30"
                        style={{ right: panelRight, width: panelWidth }}
                        onClick={closeMenu}
                    />
                )}
                <div
                    className={`fixed top-16 bottom-0 z-[1500] bg-white border-l border-gray-200 shadow-2xl transform transition-all ease-in-out duration-300 flex flex-col ${
                        isMenuOpen
                            ? "translate-x-0 opacity-100 pointer-events-auto"
                            : "translate-x-full opacity-0 pointer-events-none"
                    }`}
                    ref={drawerRef}
                    onClick={(e) => e.stopPropagation()}
                    style={{ right: panelRight, width: drawerWidth }}
                >
                    <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-2">
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
                            href="/forest"
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                            onClick={closeMenu}
                        >
                            숲
                        </Link>
                        {gardenUnlocked ? (
                            <Link
                                href="/garden"
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                onClick={closeMenu}
                            >
                                정원
                            </Link>
                        ) : (
                            <div
                                className="w-full px-3 py-2 rounded-md text-base font-medium text-gray-400 bg-gray-50 cursor-not-allowed flex items-center gap-2"
                                title="첫 번째 나무를 완성하면 정원이 열려요"
                                aria-disabled
                            >
                                <span>🔒</span>
                                <span>정원 (잠김)</span>
                            </div>
                        )}
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
                                        className="cursor-pointer block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
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

                        {/* 쿠키/정책 링크: 회원가입 아래, 서비스 소개 이전 */}
                        <div className="pt-2 mt-2 border-t border-gray-200">
                            <Link
                                href="/cookies"
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                onClick={closeMenu}
                            >
                                쿠키 정책
                            </Link>
                            <Link
                                href="/privacy"
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                onClick={closeMenu}
                            >
                                개인정보 처리방침
                            </Link>
                            <Link
                                href="/data-deletion"
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                onClick={closeMenu}
                            >
                                사용자 데이터 삭제 안내
                            </Link>
                            <Link
                                href="/terms"
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                onClick={closeMenu}
                            >
                                이용약관
                            </Link>
                        </div>

                        {/* 하단 고정: 서비스 소개 / 이용안내 */}
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
                    </div>
                </div>
            </div>

            {/* 로그아웃 확인 모달 - 두나 스타일 */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-80 animate-fade-in">
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">🍃</div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">잠깐만요!</h3>
                            <p className="text-gray-600">정말 로그아웃 하시겠어요?</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={closeLogoutConfirm}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all cursor-pointer"
                            >
                                머물기
                            </button>
                            <button
                                onClick={() => {
                                    closeLogoutConfirm();
                                    handleLogout();
                                }}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
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
