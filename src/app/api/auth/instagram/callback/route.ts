import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/escape?error=instagram_auth_failed`);
    }

    try {
        // 1️⃣ Short-lived Access Token 받기
        const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.NEXT_PUBLIC_META_APP_ID!,
                client_secret: process.env.META_APP_SECRET!,
                grant_type: "authorization_code",
                redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/instagram/callback`,
                code,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error("Instagram token error:", tokenData);
            throw new Error(tokenData.error_message || "토큰 교환 실패");
        }

        // 2️⃣ Long-lived 토큰으로 교환 (60일 유효)
        const longLivedResponse = await fetch(
            `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.META_APP_SECRET}&access_token=${tokenData.access_token}`
        );

        const longLivedData = await longLivedResponse.json();

        if (!longLivedResponse.ok) {
            console.error("Long-lived token error:", longLivedData);
            throw new Error("Long-lived 토큰 생성 실패");
        }

        // 3️⃣ 토큰을 쿠키에 저장
        const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/escape?instagram_auth=success`);

        response.cookies.set("instagram_token", longLivedData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 24 * 60 * 60, // 60일
            path: "/",
        });

        // 사용자 ID도 함께 저장 (나중에 필요할 수 있음)
        if (tokenData.user_id) {
            response.cookies.set("instagram_user_id", tokenData.user_id.toString(), {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 24 * 60 * 60,
                path: "/",
            });
        }

        return response;
    } catch (error: any) {
        console.error("Instagram callback error:", error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_BASE_URL}/escape?error=instagram_auth_failed&message=${encodeURIComponent(
                error.message
            )}`
        );
    }
}
