import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/db";
import { getJwtSecret } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    console.log("=== 카카오 로그인 API 시작 ===");
    try {
        const { code } = await request.json();
        const JWT_SECRET = getJwtSecret();
        if (!JWT_SECRET) {
            return NextResponse.json({ error: "서버 설정 오류: JWT_SECRET이 없습니다." }, { status: 500 });
        }

        if (!code) {
            return NextResponse.json({ error: "카카오 인증 코드가 필요합니다." }, { status: 400 });
        }

        const kakaoClientId = process.env.KAKAO_CLIENT_ID;
        if (!kakaoClientId) {
            console.error("KAKAO_CLIENT_ID 환경 변수가 설정되지 않았습니다.");
            return NextResponse.json({ error: "서버 설정 오류: 카카오 클라이언트 ID가 없습니다." }, { status: 500 });
        }

        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/kakao/callback`;

        const tokenParams = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: kakaoClientId,
            code: code,
            redirect_uri: redirectUri,
        });
        if (process.env.KAKAO_CLIENT_SECRET) {
            tokenParams.append("client_secret", process.env.KAKAO_CLIENT_SECRET);
        }

        const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
            body: tokenParams.toString(),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            console.error("카카오 토큰 교환 실패:", tokenData);
            return NextResponse.json(
                { error: tokenData.error_description || "토큰 교환에 실패했습니다." },
                { status: 400 }
            );
        }

        const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
            },
        });

        const userData = await userResponse.json();
        if (!userResponse.ok) {
            console.error("카카오 사용자 정보 조회 실패:", userData);
            return NextResponse.json({ error: "카카오 사용자 정보를 가져올 수 없습니다." }, { status: 401 });
        }

        console.log("카카오 사용자 정보:", userData);

        const { id, properties, kakao_account } = userData;

        const socialId = String(id);
        const nickname = properties?.nickname || kakao_account?.profile?.nickname;
        const profileImageUrl = properties?.profile_image || kakao_account?.profile?.profile_image_url;
        const email = kakao_account?.email || null;

        let user;
        let message = "카카오 로그인이 완료되었습니다.";
        let isNewUser = false;
        let couponsAwarded = 0;

        // ✅ username 사용
        const existing = await prisma.user.findFirst({
            where: { provider: "kakao", socialId },
            select: { id: true, email: true, username: true, coinBalance: true },
        });

        if (existing) {
            user = existing;
        } else {
            // 새로운 유저 생성 + 코인 10개 지급
            user = await prisma.user.create({
                data: {
                    email,
                    username: nickname || `user_${socialId}`,
                    socialId,
                    profileImageUrl,
                    provider: "kakao",
                    createdAt: new Date(),
                    coinBalance: 10, // ✅ 시작 코인
                },
                select: { id: true, email: true, username: true, coinBalance: true },
            });

            // 보상 기록 남기기
            await prisma.userReward.create({
                data: {
                    userId: user.id,
                    type: "signup",
                    amount: 10,
                    unit: "coin",
                },
            });

            message = "카카오 회원가입이 완료되었습니다. 코인 10개가 지급되었습니다.";
            isNewUser = true;
            couponsAwarded = 10;
        }

        // ✅ 토큰에 username 반영
        const token = jwt.sign({ userId: user.id, email: user.email, name: user.username }, JWT_SECRET, {
            expiresIn: "7d",
        });

        const responsePayload = {
            success: true,
            message,
            token,
            user: { id: user.id, email: user.email, name: user.username, coins: user.coinBalance },
            newUser: isNewUser,
            coinsAwarded: couponsAwarded,
        };

        const res = NextResponse.json(responsePayload);
        res.cookies.set("auth", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });
        return res;
    } catch (error) {
        console.error("카카오 로그인 API 전체 오류:", error);
        return NextResponse.json(
            {
                error: "카카오 로그인 중 서버 오류가 발생했습니다.",
                details: error instanceof Error ? error.message : "알 수 없는 오류",
            },
            { status: 500 }
        );
    }
}
