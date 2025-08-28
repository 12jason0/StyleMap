"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

const Signup = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        name: "", // 닉네임으로 사용
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Instagram 인증 성공/실패 처리
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const authSuccess = urlParams.get("auth_success");
        const token = urlParams.get("token");
        const userParam = urlParams.get("user");
        const error = urlParams.get("error");
        const message = urlParams.get("message");

        // 인증 성공 처리
        if (authSuccess === "true" && token && userParam) {
            console.log("Instagram 회원가입 성공!");

            try {
                const user = JSON.parse(decodeURIComponent(userParam));

                // 토큰과 사용자 정보 저장
                localStorage.setItem("token", token);
                localStorage.setItem("user", JSON.stringify(user));

                // URL 파라미터 제거
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, "", cleanUrl);

                // 홈페이지로 이동
                router.push("/?welcome=true");
            } catch (parseError) {
                console.error("사용자 정보 파싱 오류:", parseError);
                setError("회원가입 처리 중 오류가 발생했습니다.");
            }
        }

        // 에러 처리
        if (error === "instagram_auth_failed" && message) {
            console.error("Instagram 인증 실패:", message);
            setError(`Instagram 회원가입 실패: ${decodeURIComponent(message)}`);

            // URL 파라미터 제거
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, "", cleanUrl);
        }
    }, [router]);

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

        // 비밀번호 확인
        if (formData.password !== formData.confirmPassword) {
            setError("비밀번호가 일치하지 않습니다.");
            setLoading(false);
            return;
        }

        // 비밀번호 길이 확인
        if (formData.password.length < 6) {
            setError("비밀번호는 최소 6자 이상이어야 합니다.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // 회원가입 성공 시 로그인 페이지로 이동
                router.push("/login?message=회원가입이 완료되었습니다. 로그인해주세요.");
            } else {
                setError(data.error || "회원가입에 실패했습니다.");
            }
        } catch (error) {
            console.error("회원가입 오류:", error);
            setError("회원가입 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialSignup = async (provider: string) => {
        if (loading) return;

        setLoading(true);
        setError("");

        try {
            if (provider === "instagram") {
                // Instagram OAuth URL로 직접 리다이렉트
                const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID || "1762397561331881";
                const redirectUri = `${window.location.origin}/api/auth/instagram/callback`;

                console.log("Instagram 회원가입 시작");
                console.log("클라이언트 ID:", clientId);
                console.log("리다이렉트 URI:", redirectUri);

                const instagramAuthUrl =
                    `https://api.instagram.com/oauth/authorize?` +
                    new URLSearchParams({
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        scope: "user_profile",
                        response_type: "code",
                    }).toString();

                console.log("Instagram 인증 URL:", instagramAuthUrl);

                // 직접 리다이렉트 (API 호출 없이)
                window.location.href = instagramAuthUrl;
                return; // 리다이렉트되므로 여기서 종료
            }

            // Google과 Kakao는 기존 로직 유지
            if (provider === "google" || provider === "kakao") {
                // 실제 구현에서는 각 소셜 로그인 SDK를 사용해야 합니다
                // 여기서는 데모용으로 시뮬레이션합니다
                const mockToken = `mock-${provider}-token-${Date.now()}`;

                const response = await fetch(`/api/auth/${provider}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ accessToken: mockToken }),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem("authToken", data.token);
                    window.dispatchEvent(new Event("authTokenChange"));
                    router.push("/");
                } else {
                    setError(data.error || `${provider} 회원가입에 실패했습니다.`);
                }
            }
        } catch (error) {
            console.error(`${provider} 회원가입 오류:`, error);
            setError(`${provider} 회원가입 중 오류가 발생했습니다.`);
        } finally {
            // Instagram의 경우 리다이렉트되므로 setLoading(false)가 실행되지 않음
            if (provider !== "instagram") {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <Header />

            <main className="max-w-md mx-auto px-4 py-8 pt-24">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">회원가입</h1>
                        <p className="text-gray-600">StyleMap과 함께 여행을 시작하세요</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6 text-gray-600">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                닉네임
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="닉네임을 입력하세요"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                이메일
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="이메일을 입력하세요"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                비밀번호
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="비밀번호를 입력하세요 (최소 6자)"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                비밀번호 확인
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="비밀번호를 다시 입력하세요"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? "회원가입 중..." : "회원가입"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            이미 계정이 있으신가요?{" "}
                            <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                                로그인
                            </Link>
                        </p>
                    </div>

                    {/* 소셜 회원가입 구분선 */}
                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">또는</span>
                            </div>
                        </div>
                    </div>

                    {/* 소셜 회원가입 버튼들 */}
                    <div className="mt-6 space-y-3 text-black">
                        <button
                            type="button"
                            onClick={() => handleSocialSignup("google")}
                            disabled={loading}
                            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Google로 회원가입
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSocialSignup("kakao")}
                            disabled={loading}
                            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <svg className="w-5 h-5 mr-3" fill="#FEE500" viewBox="0 0 24 24">
                                <path d="M12 3c5.799 0 10.5 4.701 10.5 10.5S17.799 24 12 24S1.5 19.299 1.5 13.5S6.201 3 12 3m0-3C5.373 0 0 5.373 0 12s5.373 12 12 12s12-5.373 12-12S18.627 0 12 0z" />
                                <path d="M12 6.5c-3.038 0-5.5 2.462-5.5 5.5s2.462 5.5 5.5 5.5s5.5-2.462 5.5-5.5S15.038 6.5 12 6.5z" />
                            </svg>
                            카카오톡으로 회원가입
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSocialSignup("instagram")}
                            disabled={loading}
                            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <svg className="w-5 h-5 mr-3" fill="#E4405F" viewBox="0 0 24 24">
                                <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.897 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.897-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                            </svg>
                            Instagram으로 회원가입
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Signup;
