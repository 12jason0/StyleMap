import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "stylemap-secret-key-2024";

export async function GET(request: NextRequest) {
    console.log("=== Instagram 인증 콜백 시작 ===");

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    console.log("콜백 파라미터:", { code: code?.slice(0, 20) + "...", error, errorDescription });

    if (error) {
        console.error("Instagram OAuth 에러:", error, errorDescription);
        return NextResponse.redirect(
            `${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/signup?error=instagram_auth_failed&message=${encodeURIComponent(errorDescription || error)}`
        );
    }

    if (!code) {
        console.error("인증 코드가 없음");
        return NextResponse.redirect(
            `${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/signup?error=instagram_auth_failed&message=${encodeURIComponent("인증 코드가 없습니다.")}`
        );
    }

    let connection;
    try {
        // 1. Instagram 토큰 교환
        console.log("Instagram 토큰 교환 시작...");
        const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body: new URLSearchParams({
                client_id: process.env.INSTAGRAM_CLIENT_ID || "1762397561331881",
                client_secret: process.env.INSTAGRAM_CLIENT_SECRET || "2613a9c82e3f503b8845781a3146151f",
                grant_type: "authorization_code",
                redirect_uri: `${
                    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
                }/api/auth/instagram/callback`,
                code,
            }),
        });

        const tokenData = await tokenResponse.json();
        console.log("토큰 응답 상태:", tokenResponse.status);
        console.log("토큰 데이터:", tokenData);

        if (!tokenResponse.ok || tokenData.error) {
            console.error("토큰 교환 실패:", tokenData);
            throw new Error(tokenData.error_message || tokenData.error || "토큰 교환 실패");
        }

        // 2. 사용자 정보 가져오기
        console.log("Instagram 사용자 정보 조회...");
        const userResponse = await fetch(
            `https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`
        );

        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error("사용자 정보 조회 실패:", userResponse.status, errorText);
            throw new Error("Instagram 사용자 정보를 가져올 수 없습니다.");
        }

        const instagramUser = await userResponse.json();
        console.log("Instagram 사용자 데이터:", instagramUser);

        const { id: instagramId, username } = instagramUser;
        const email = `${username}@instagram.stylemap.com`;

        // 3. 데이터베이스 처리
        console.log("데이터베이스 연결 및 사용자 처리...");
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 기존 사용자 확인
        const [existingUsers] = await connection.execute(
            "SELECT id, email, name, instagram_id FROM users WHERE email = ? OR instagram_id = ?",
            [email, instagramId]
        );

        const usersArray = existingUsers as any[];
        let user;

        if (usersArray.length > 0) {
            // 기존 사용자 로그인
            console.log("기존 사용자 발견 - 로그인 처리");
            user = usersArray[0];

            // Instagram ID가 없으면 업데이트
            if (!user.instagram_id) {
                await connection.execute("UPDATE users SET instagram_id = ?, updated_at = NOW() WHERE id = ?", [
                    instagramId,
                    user.id,
                ]);
            }
        } else {
            // 새 사용자 회원가입
            console.log("새 사용자 생성 - 회원가입 처리");
            const [result] = await connection.execute(
                "INSERT INTO users (email, name, instagram_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
                [email, username, instagramId]
            );

            const insertResult = result as any;
            user = {
                id: insertResult.insertId,
                email,
                name: username,
                instagram_id: instagramId,
            };
        }

        await connection.commit();

        // 4. JWT 토큰 생성
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                name: user.name,
            },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        console.log("Instagram 인증 성공! 사용자:", user.name);

        // 5. 성공 페이지로 리디렉션
        const redirectUrl = `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/?auth_success=true&token=${token}&user=${encodeURIComponent(
            JSON.stringify({
                id: user.id,
                email: user.email,
                name: user.name,
            })
        )}`;

        return NextResponse.redirect(redirectUrl);
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error("Instagram 콜백 처리 오류:", error);

        return NextResponse.redirect(
            `${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/signup?error=instagram_auth_failed&message=${encodeURIComponent(
                error instanceof Error ? error.message : "알 수 없는 오류"
            )}`
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
