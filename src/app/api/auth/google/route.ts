import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

const JWT_SECRET = "stylemap-secret-key-2024";

export async function POST(request: NextRequest) {
    try {
        const { accessToken } = await request.json();

        if (!accessToken) {
            return NextResponse.json({ error: "Google 액세스 토큰이 필요합니다." }, { status: 400 });
        }

        // Google API를 통해 사용자 정보 가져오기
        const googleResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);

        if (!googleResponse.ok) {
            return NextResponse.json({ error: "Google 토큰이 유효하지 않습니다." }, { status: 401 });
        }

        const googleUser = await googleResponse.json();
        const { id, email, name, picture } = googleUser;

        const connection = await pool.getConnection();

        try {
            // 기존 사용자 확인
            const [existingUsers] = await connection.execute(
                "SELECT id, email, name FROM users WHERE email = ? OR google_id = ?",
                [email, id]
            );

            const usersArray = existingUsers as any[];

            if (usersArray.length > 0) {
                // 기존 사용자 로그인
                const user = usersArray[0];

                // Google ID가 없으면 업데이트
                if (!user.google_id) {
                    await connection.execute("UPDATE users SET google_id = ? WHERE id = ?", [id, user.id]);
                }

                const token = jwt.sign(
                    {
                        userId: user.id,
                        email: user.email,
                        name: user.name,
                    },
                    JWT_SECRET,
                    { expiresIn: "7d" }
                );

                return NextResponse.json({
                    success: true,
                    message: "Google 로그인이 완료되었습니다.",
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                    },
                });
            } else {
                // 새 사용자 생성
                const [result] = await connection.execute(
                    "INSERT INTO users (email, name, google_id, profile_image) VALUES (?, ?, ?, ?)",
                    [email, name, id, picture]
                );

                const insertResult = result as any;
                const userId = insertResult.insertId;

                const token = jwt.sign(
                    {
                        userId,
                        email,
                        name,
                    },
                    JWT_SECRET,
                    { expiresIn: "7d" }
                );

                return NextResponse.json({
                    success: true,
                    message: "Google 회원가입이 완료되었습니다.",
                    token,
                    user: {
                        id: userId,
                        email,
                        name,
                    },
                });
            }
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Google 로그인 오류:", error);
        return NextResponse.json({ error: "Google 로그인 중 오류가 발생했습니다." }, { status: 500 });
    }
}
