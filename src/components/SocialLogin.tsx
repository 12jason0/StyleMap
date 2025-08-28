"use client";

import { useState } from "react";

interface SocialLoginProps {
    onSuccess?: (token: string, user: any) => void;
    onError?: (error: string) => void;
}

export default function SocialLogin({ onSuccess, onError }: SocialLoginProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setIsLoading("google");
        try {
            // Google OAuth 팝업 열기
            const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
            const redirectUri = `${window.location.origin}/api/auth/google/callback`;
            const scope = "email profile";

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(
                redirectUri
            )}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline`;

            const popup = window.open(authUrl, "google-login", "width=500,height=600");

            // 팝업에서 인증 코드 받기
            window.addEventListener("message", async (event) => {
                if (event.origin !== window.location.origin) return;

                if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
                    const { code } = event.data;

                    // 서버에 인증 코드 전송
                    const response = await fetch("/api/auth/google", {
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
            console.error("Google login error:", error);
            onError?.("Google 로그인에 실패했습니다.");
            setIsLoading(null);
        }
    };

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

    const handleInstagramAuth = () => {
        console.log("Instagram 인증 시작");
        setIsLoading("instagram");

        try {
            const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID || "1762397561331881";
            const redirectUri = `${window.location.origin}/api/auth/instagram/callback`;

            const instagramAuthUrl =
                `https://api.instagram.com/oauth/authorize?` +
                new URLSearchParams({
                    client_id: clientId,
                    redirect_uri: redirectUri,
                    scope: "user_profile",
                    response_type: "code",
                }).toString();

            window.location.href = instagramAuthUrl;
        } catch (error) {
            console.error("Instagram 인증 오류:", error);
            onError?.("Instagram 인증에 실패했습니다.");
            setIsLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <p className="text-gray-600 mb-2">소셜 계정으로 간편하게 로그인하세요</p>
            </div>

            {/* Google 로그인 */}
            <button
                onClick={handleGoogleLogin}
                disabled={isLoading !== null}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">G</span>
                </div>
                <span className="font-medium text-gray-700">
                    {isLoading === "google" ? "로그인 중..." : "Google로 계속하기"}
                </span>
            </button>

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

            {/* Instagram 인증 */}
            <button
                onClick={handleInstagramAuth}
                disabled={isLoading !== null}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50"
            >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.897 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.897-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                </svg>
                <span className="font-medium">
                    {isLoading === "instagram" ? "인증 중..." : "Instagram으로 시작하기"}
                </span>
            </button>
        </div>
    );
}
