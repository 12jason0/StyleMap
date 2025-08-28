"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import SocialLogin from "@/components/SocialLogin";

const Login = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
                // 토큰을 localStorage에 저장
                localStorage.setItem("authToken", data.token);
                // 헤더 상태 업데이트를 위한 이벤트 발생
                window.dispatchEvent(new Event("authTokenChange"));
                // 홈페이지로 이동
                router.push("/");
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <Header />

            <main className="max-w-md mx-auto px-4 py-8 pt-24">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">로그인</h1>
                        <p className="text-gray-600">StyleMap에 오신 것을 환영합니다</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-6 text-gray-600Failed to load resource: the server responded with a status of 500 (Internal Server Error)"
                    >
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
                                placeholder="비밀번호를 입력하세요"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? "로그인 중..." : "로그인"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            계정이 없으신가요?{" "}
                            <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
                                회원가입
                            </Link>
                        </p>
                    </div>

                    {/* 소셜 로그인 */}
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

                    <div className="mt-6">
                        <SocialLogin
                            onSuccess={(token, user) => {
                                localStorage.setItem("authToken", token);
                                window.dispatchEvent(new Event("authTokenChange"));
                                router.push("/");
                            }}
                            onError={(error) => {
                                setError(error);
                            }}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Login;
