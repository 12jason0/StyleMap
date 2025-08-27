"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        nickname: "",
        agreeToTerms: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
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

        // 약관 동의 확인
        if (!formData.agreeToTerms) {
            setError("이용약관에 동의해주세요.");
            setLoading(false);
            return;
        }

        try {
            // TODO: 실제 회원가입 API 연동
            console.log("회원가입 시도:", formData);

            // 임시 회원가입 성공 처리
            setTimeout(() => {
                router.push("/login");
            }, 1000);
        } catch (err) {
            setError("회원가입에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header />
            <main className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
                <div className="w-full max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left Side - Welcome Text */}
                        <div className="text-center lg:text-left">
                            <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                StyleMap과 함께 시작하세요
                            </h1>
                            <p className="text-lg lg:text-xl text-gray-600 mb-8">
                                특별한 여행 경험을 공유하고 새로운 모험을 시작해보세요
                            </p>

                            {/* Benefits */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-lg text-white">🎯</span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-800 mb-1">맞춤형 추천</h3>
                                    <p className="text-xs text-gray-600">취향에 맞는 코스 추천</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-lg text-white">💬</span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-800 mb-1">실시간 소통</h3>
                                    <p className="text-xs text-gray-600">다른 여행자들과 소통</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-lg text-white">🏆</span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-800 mb-1">특별한 혜택</h3>
                                    <p className="text-xs text-gray-600">회원만의 특별한 혜택</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Signup Form */}
                        <div className="max-w-md mx-auto w-full">
                            <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">회원가입</h2>
                                    <p className="text-gray-600 text-sm">새로운 계정을 만들어보세요</p>
                                </div>

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-red-600 text-xs">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label
                                            htmlFor="nickname"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            닉네임
                                        </label>
                                        <input
                                            type="text"
                                            id="nickname"
                                            name="nickname"
                                            value={formData.nickname}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="사용할 닉네임을 입력하세요"
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
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="your@email.com"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="password"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            비밀번호
                                        </label>
                                        <input
                                            type="password"
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                            minLength={8}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="••••••••"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">최소 8자 이상 입력해주세요</p>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="confirmPassword"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            비밀번호 확인
                                        </label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    <div className="flex items-start">
                                        <input
                                            type="checkbox"
                                            id="agreeToTerms"
                                            name="agreeToTerms"
                                            checked={formData.agreeToTerms}
                                            onChange={handleInputChange}
                                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="agreeToTerms" className="ml-2 text-xs text-gray-600">
                                            <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                                                이용약관
                                            </Link>
                                            및{" "}
                                            <Link
                                                href="/privacy"
                                                className="text-blue-600 hover:text-blue-800 underline"
                                            >
                                                개인정보처리방침
                                            </Link>
                                            에 동의합니다
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        {loading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                가입 중...
                                            </div>
                                        ) : (
                                            "회원가입"
                                        )}
                                    </button>
                                </form>

                                <div className="mt-6 text-center">
                                    <p className="text-gray-600 text-sm">
                                        이미 계정이 있으신가요?{" "}
                                        <Link
                                            href="/login"
                                            className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                                        >
                                            로그인
                                        </Link>
                                    </p>
                                </div>

                                {/* Social Signup */}
                                <div className="mt-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-300" />
                                        </div>
                                        <div className="relative flex justify-center text-xs">
                                            <span className="px-2 bg-white text-gray-500">또는</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                        >
                                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
                                            className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                            </svg>
                                            Facebook으로 회원가입
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
