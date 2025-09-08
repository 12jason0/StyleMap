import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { getJwtSecret } from "@/lib/auth";

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

        const tokenParams = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: kakaoClientId,
            code: code,
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/kakao/callback`,
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
        // [수정된 부분] email이 undefined일 경우를 대비해 null을 할당합니다.
        const email = kakao_account?.email || null;

        const connection = await pool.getConnection();

        try {
            const [existingUsers] = await connection.execute(
                "SELECT id, email, nickname FROM users WHERE provider = ? AND socialId = ?",
                ["kakao", socialId]
            );

            const usersArray = existingUsers as Array<{ id: number; email: string; nickname: string }>;

            if (usersArray.length > 0) {
                const user = usersArray[0];
                console.log("기존 사용자 로그인:", user);

                const token = jwt.sign({ userId: user.id, email: user.email, name: user.nickname }, JWT_SECRET, {
                    expiresIn: "7d",
                });

                return NextResponse.json({
                    success: true,
                    message: "카카오 로그인이 완료되었습니다.",
                    token,
                    user: { id: user.id, email: user.email, name: user.nickname },
                });
            } else {
                console.log("신규 사용자 회원가입");

                const [result] = await connection.execute(
                    "INSERT INTO users (email, nickname, socialId, profileImageUrl, provider, createdAt) VALUES (?, ?, ?, ?, 'kakao', NOW())",
                    [email, nickname || `user_${socialId}`, socialId, profileImageUrl]
                );

                const insertResult = result as { insertId: number };
                const userId = insertResult.insertId;

                const token = jwt.sign({ userId, email, name: nickname || `user_${socialId}` }, JWT_SECRET, {
                    expiresIn: "7d",
                });

                return NextResponse.json({
                    success: true,
                    message: "카카오 회원가입이 완료되었습니다.",
                    token,
                    user: { id: userId, email, name: nickname || `user_${socialId}` },
                });
            }
        } finally {
            connection.release();
        }
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
