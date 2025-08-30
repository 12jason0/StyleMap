"use client";

import { useState } from "react";

interface SocialLoginProps {
    onSuccess?: (token: string, user: unknown) => void;
    onError?: (error: string) => void;
}

export default function SocialLogin({ onSuccess, onError }: SocialLoginProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleKakaoLogin = async () => {
        setIsLoading("kakao");
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
                        onSuccess?.(data.token, data.user);
                    } else {
                        onError?.(data.error);
                    }

                    popup?.close();
                    setIsLoading(null);
                }
            });
        } catch (error) {
            console.error("Kakao login error:", error);
            onError?.("카카오 로그인에 실패했습니다.");
            setIsLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <p className="text-gray-600 mb-2">소셜 계정으로 간편하게 로그인하세요</p>
            </div>

            {/* Kakao 로그인 */}
            <button
                onClick={handleKakaoLogin}
                disabled={isLoading !== null}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
            >
                <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">K</span>
                </div>
                <span className="font-medium">{isLoading === "kakao" ? "로그인 중..." : "카카오로 계속하기"}</span>
            </button>
        </div>
    );
}
