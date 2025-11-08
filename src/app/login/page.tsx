"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { fetchSession } from "@/lib/authClient";

const Login = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const scrollAreaRef = useRef<HTMLDivElement | null>(null);

    // 페이지 로드 시 스크롤을 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // URL 파라미터에서 메시지 확인
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlMessage = urlParams.get("message");

        if (urlMessage) {
            setMessage(decodeURIComponent(urlMessage));
            // URL에서 메시지 파라미터 제거
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, "", cleanUrl);
        }
    }, []);

    // 로그인 페이지에서 전역 스크롤 완전 비활성화 (터치/휠 포함)
    useEffect(() => {
        const scrollY = window.scrollY || window.pageYOffset;

        // 기존 스타일 보관
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyPosition = document.body.style.position;
        const previousBodyTop = document.body.style.top;
        const previousBodyWidth = document.body.style.width;
        const previousBodyOverscroll = document.body.style.getPropertyValue("overscroll-behavior");
        const previousBodyTouchAction = document.body.style.getPropertyValue("touch-action");
        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousHtmlOverscroll = document.documentElement.style.getPropertyValue("overscroll-behavior");

        // 이벤트 핸들러: 휠/터치 이동 방지
        const preventScroll = (e: Event) => {
            try {
                const target = e.target as Node | null;
                if (scrollAreaRef.current && target && scrollAreaRef.current.contains(target)) {
                    // 스크롤 허용 영역(메뉴) 내에서는 기본 스크롤 허용
                    return;
                }
            } catch {}
            e.preventDefault();
        };
        window.addEventListener("wheel", preventScroll, { passive: false });
        window.addEventListener("touchmove", preventScroll, { passive: false });

        // 키보드로 인한 스크롤 방지 (입력 요소 제외)
        const keydownHandler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.closest("input, textarea, [contenteditable='true']") || target.tagName === "SELECT")
            ) {
                return;
            }
            const blockKeys = ["Space", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"];
            if (blockKeys.includes(e.code)) {
                e.preventDefault();
            }
        };
        window.addEventListener("keydown", keydownHandler, { passive: false });

        // 실제 스크롤 락: body 고정 및 overscroll 차단
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = "100%";
        document.body.style.setProperty("overscroll-behavior", "none");
        document.body.style.setProperty("touch-action", "none");
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.setProperty("overscroll-behavior", "none");

        // 해제 시 복원
        return () => {
            window.removeEventListener("wheel", preventScroll as EventListener, false);
            window.removeEventListener("touchmove", preventScroll as EventListener, false);
            window.removeEventListener("keydown", keydownHandler as EventListener, false);

            document.body.style.overflow = previousBodyOverflow;
            document.body.style.position = previousBodyPosition;
            document.body.style.top = previousBodyTop;
            document.body.style.width = previousBodyWidth;
            if (previousBodyOverscroll) {
                document.body.style.setProperty("overscroll-behavior", previousBodyOverscroll);
            } else {
                document.body.style.removeProperty("overscroll-behavior");
            }
            if (previousBodyTouchAction) {
                document.body.style.setProperty("touch-action", previousBodyTouchAction);
            } else {
                document.body.style.removeProperty("touch-action");
            }
            document.documentElement.style.overflow = previousHtmlOverflow;
            if (previousHtmlOverscroll) {
                document.documentElement.style.setProperty("overscroll-behavior", previousHtmlOverscroll);
            } else {
                document.documentElement.style.removeProperty("overscroll-behavior");
            }
            window.scrollTo(0, scrollY);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                // 서버 응답의 토큰도 함께 로컬스토리지에 저장하여 기존 헤더 로직과 동기화
                if (data?.token) {
                    localStorage.setItem("authToken", data.token);
                    if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
                    localStorage.setItem("loginTime", Date.now().toString());
                    window.dispatchEvent(new CustomEvent("authTokenChange", { detail: { token: data.token } }));
                } else {
                    // 쿠키만 설정된 케이스: 세션 조회 후 이벤트 발생
                    await fetchSession();
                    window.dispatchEvent(new CustomEvent("authTokenChange"));
                }

                // 모바일 WebView에 로그인 성공 알림
                try {
                    if ((window as any).ReactNativeWebView) {
                        (window as any).ReactNativeWebView.postMessage(
                            JSON.stringify({
                                type: "loginSuccess",
                                userId: data?.user?.id ?? null,
                                token: data?.token ?? null,
                            })
                        );
                    }
                } catch {}

                // 홈페이지로 이동 (로그인 성공 모달 표시)
                router.push("/?login_success=true");
            } else {
                setError(data.error || "로그인에 실패했습니다.");
            }
        } catch (error) {
            console.error("로그인 오류:", error);
            setError("로그인 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: string) => {
        if (loading) return;
        setLoading(true);
        setError("");
        setMessage("");

        if (provider === "kakao") {
            const kakaoClientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
            const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/kakao/callback`;

            if (!kakaoClientId) {
                setError("환경변수 NEXT_PUBLIC_KAKAO_CLIENT_ID가 설정되지 않았습니다.");
                setLoading(false);
                return;
            }

            const kakaoAuthUrl =
                `https://kauth.kakao.com/oauth/authorize?` +
                new URLSearchParams({
                    client_id: kakaoClientId,
                    redirect_uri: redirectUri,
                    response_type: "code",
                    scope: "profile_nickname, profile_image",
                }).toString();

            console.log("카카오 로그인 시작");
            console.log("카카오 인증 URL:", kakaoAuthUrl);
            console.log("Expected origin:", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

            const popup = window.open(
                kakaoAuthUrl,
                "kakao-login",
                "width=500,height=700,scrollbars=yes,resizable=yes,left=" +
                    (screen.width / 2 - 250) +
                    ",top=" +
                    (screen.height / 2 - 350)
            );

            if (!popup) {
                setError("팝업이 차단되었습니다. 팝업 차단을 해제해주세요.");
                setLoading(false);
                return;
            }

            let intervalId: NodeJS.Timeout | null = null;

            const cleanup = () => {
                if (intervalId) clearInterval(intervalId);
                window.removeEventListener("message", messageHandler);
                if (popup && !popup.closed) popup.close();
                setLoading(false);
            };

            const messageHandler = async (event: MessageEvent) => {
                // origin 체크를 더 유연하게
                const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

                if (event.origin !== expectedOrigin && event.origin !== window.location.origin) {
                    console.log("Origin mismatch - expected:", expectedOrigin, "received:", event.origin);
                    return;
                }

                console.log("팝업에서 받은 메시지:", event.data);

                const { type, code, error, error_description } = event.data;

                if (type === "KAKAO_AUTH_CODE" && code) {
                    console.log("카카오 인증 코드 받음:", code);
                    try {
                        const response = await fetch("/api/auth/kakao", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ code }),
                        });

                        const data = await response.json();
                        if (!response.ok) {
                            throw new Error(data.details || data.error || "서버 처리 중 오류가 발생했습니다.");
                        }

                        console.log("카카오 로그인 최종 성공!", data);
                        localStorage.setItem("authToken", data.token);
                        localStorage.setItem("user", JSON.stringify(data.user));
                        localStorage.setItem("loginTime", Date.now().toString());
                        window.dispatchEvent(new CustomEvent("authTokenChange", { detail: { token: data.token } }));
                        try {
                            if ((window as any).ReactNativeWebView) {
                                (window as any).ReactNativeWebView.postMessage(
                                    JSON.stringify({ type: "loginSuccess", userId: data?.user?.id ?? null, token: data?.token ?? null })
                                );
                            }
                        } catch {}
                        router.push("/?login_success=true");
                    } catch (err: unknown) {
                        console.error("카카오 로그인 처리 오류:", err);
                        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
                    } finally {
                        cleanup();
                    }
                } else if (type === "KAKAO_AUTH_ERROR") {
                    console.error("카카오 인증 에러:", error, error_description);
                    setError(`카카오 인증 실패: ${error_description || error}`);
                    cleanup();
                }
            };

            intervalId = setInterval(() => {
                if (popup.closed) {
                    console.log("카카오 인증 팝업이 닫혔습니다.");
                    cleanup();
                }
            }, 1000);

            window.addEventListener("message", messageHandler);

            return;
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-[var(--brand-cream)] to-white">
            <main
                className="max-w-sm mx-auto px-4 pt-8 pb-28 flex items-center"
                style={{ minHeight: "calc(100dvh - 120px)" }}
            >
                <div className="w-full bg-white rounded-2xl shadow-sm border border-green-100 p-6 flex flex-col max-h-[calc(100dvh-160px)]">
                    <div className="text-center mb-6">
                        <div className="mx-auto mb-2 w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <span className="text-2xl">🌿</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1 font-brand">로그인</h1>
                        <p className="text-gray-600 text-sm">DoNa에 오신 것을 환영합니다</p>
                    </div>
                    <div ref={scrollAreaRef} className="flex-1 min-h-0 overflow-y-auto pr-1">

                    {message && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-600 text-sm">{message}</p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6 text-gray-600">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-2">
                                이메일
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="이메일을 입력하세요"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-800 mb-2">
                                비밀번호
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="비밀번호를 입력하세요"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {loading ? "로그인 중..." : "로그인"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            계정이 없으신가요?{" "}
                            <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 font-medium">
                                회원가입
                            </Link>
                        </p>
                    </div>

                    <div className="mt-2">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-green-100" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">또는</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3 text-black">
                        <button
                            type="button"
                            onClick={() => handleSocialLogin("kakao")}
                            disabled={loading}
                            className="w-full flex items-center justify-center px-4 py-3 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold shadow"
                        >
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3c5.799 0 10.5 3.402 10.5 7.5 0 4.098-4.701 7.5-10.5 7.5-.955 0-1.886-.1-2.777-.282L3.234 21l1.781-3.13C3.69 16.56 1.5 14.165 1.5 10.5 1.5 6.402 6.201 3 12 3z" />
                            </svg>
                            {loading ? "카카오톡 인증 중..." : "카카오톡으로 로그인"}
                        </button>
                    </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Login;
