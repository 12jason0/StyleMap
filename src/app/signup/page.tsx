// /src/app/signup/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header"; // Header 컴포넌트 경로 확인 필요

const Signup = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        nickname: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        if (error) setError("");
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!formData.nickname.trim() || formData.nickname.length < 2) {
            setError("닉네임은 2자 이상 입력해주세요.");
            setLoading(false);
            return;
        }
        if (formData.password.length < 6) {
            setError("비밀번호는 최소 6자 이상이어야 합니다.");
            setLoading(false);
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("비밀번호가 일치하지 않습니다.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    nickname: formData.nickname.trim(),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                router.push("/login?message=회원가입이 완료되었습니다. 로그인해주세요.");
            } else {
                setError(data.error || "회원가입에 실패했습니다.");
            }
        } catch (err) {
            console.error("회원가입 오류:", err);
            setError("회원가입 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialSignup = async (provider: "kakao") => {
        if (loading) return;
        setLoading(true);
        setError("");

        try {
            // 카카오 OAuth 팝업 방식으로 변경
            const kakaoClientId = "833e9f9d0fea3b8c19f979c877cc0b23";
            const redirectUri = `${window.location.origin}/api/auth/kakao/callback`;

            const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoClientId}&redirect_uri=${encodeURIComponent(
                redirectUri
            )}&response_type=code`;

            const popup = window.open(authUrl, "kakao-login", "width=500,height=600");

            window.addEventListener("message", async (event) => {
                if (event.origin !== window.location.origin) return;

                if (event.data.type === "KAKAO_AUTH_SUCCESS") {
                    const { code } = event.data;

                    const response = await fetch("/api/auth/kakao", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ code }),
                    });

                    const data = await response.json();

                    if (data.success) {
                        // 로그인 성공 시 홈페이지로 이동
                        router.push("/?signup_success=true");
                    } else {
                        setError(data.error || "카카오 회원가입에 실패했습니다.");
                    }

                    popup?.close();
                    setLoading(false);
                }
            });
        } catch (error) {
            console.error("Kakao signup error:", error);
            setError("카카오 회원가입에 실패했습니다.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-black">
            <Header />
            <main className="max-w-md mx-auto px-4 py-8 pt-24">
                <div className="bg-white rounded-2xl shadow-md p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">회원가입</h1>
                        <p className="text-gray-600">StyleMap과 함께 여행을 시작하세요</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-100 border border-red-300 rounded-lg text-center">
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {/* 소셜 회원가입 버튼 */}
                    <div className="mt-6 space-y-3">
                        <button
                            type="button"
                            onClick={() => handleSocialSignup("kakao")}
                            disabled={loading}
                            className="w-full flex items-center justify-center px-4 py-3 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
                        >
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3c5.799 0 10.5 3.402 10.5 7.5 0 4.098-4.701 7.5-10.5 7.5-.955 0-1.886-.1-2.777-.282L3.234 21l1.781-3.13C3.69 16.56 1.5 14.165 1.5 10.5 1.5 6.402 6.201 3 12 3z" />
                            </svg>
                            {loading ? "카카오톡 인증 중..." : "카카오톡으로 회원가입"}
                        </button>
                    </div>

                    <div className="my-6 relative flex justify-center text-sm">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <span className="relative px-2 bg-white text-gray-500">또는</span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                                닉네임
                            </label>
                            <input
                                type="text"
                                id="nickname"
                                name="nickname"
                                value={formData.nickname}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                이메일
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                비밀번호
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                비밀번호 확인
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? "가입하는 중..." : "이메일로 회원가입"}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <p className="text-gray-500">
                            이미 계정이 있으신가요?{" "}
                            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
                                로그인
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Signup;
