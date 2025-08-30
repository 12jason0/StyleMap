import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "stylemap-secret-key-2024-very-long-and-secure";

export async function GET(request: NextRequest) {
    try {
        console.log("=== 프로필 API 시작 ===");
        const authHeader = request.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("인증 토큰 없음");
            return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
        }

        const token = authHeader.substring(7);
        console.log("토큰 확인됨");

        try {
            console.log("JWT 토큰 검증 중...");
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
            console.log("JWT 디코딩 결과:", decoded);
            const userId = decoded.userId;
            console.log("사용자 ID:", userId);

            const connection = await pool.getConnection();

            try {
                const [users] = await connection.execute(
                    "SELECT id, email, nickname, profileImageUrl, mbti, age, createdAt FROM users WHERE id = ?",
                    [userId]
                );

                const userArray = users as Array<{
                    id: number;
                    email: string;
                    nickname: string;
                    profileImageUrl: string;
                    mbti: string;
                    age: number;
                    createdAt: string;
                }>;

                if (userArray.length === 0) {
                    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
                }

                const user = userArray[0];

                return NextResponse.json({
                    success: true,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.nickname,
                        profileImage: user.profileImageUrl || null,
                        mbti: user.mbti || null,
                        age: user.age || null,
                        joinDate: new Date(user.createdAt).toLocaleDateString("ko-KR"),
                    },
                });
            } finally {
                connection.release();
            }
        } catch {
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }
    } catch (error) {
        console.error("프로필 조회 오류:", error);
        return NextResponse.json({ error: "프로필 조회 중 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { name, email, mbti, age } = await request.json();

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
            const userId = decoded.userId;

            const connection = await pool.getConnection();

            try {
                // 이메일 중복 확인 (자신의 이메일 제외)
                const [existingUsers] = await connection.execute("SELECT id FROM users WHERE email = ? AND id != ?", [
                    email,
                    userId,
                ]);

                const existingUsersArray = existingUsers as Array<{ id: number }>;
                if (existingUsersArray.length > 0) {
                    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
                }

                // 프로필 업데이트
                await connection.execute("UPDATE users SET nickname = ?, email = ?, mbti = ?, age = ? WHERE id = ?", [
                    name,
                    email,
                    mbti,
                    age,
                    userId,
                ]);

                return NextResponse.json({
                    success: true,
                    message: "프로필이 성공적으로 수정되었습니다.",
                    user: {
                        id: userId,
                        email,
                        name,
                        mbti,
                        age,
                    },
                });
            } finally {
                connection.release();
            }
        } catch {
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }
    } catch (error) {
        console.error("프로필 수정 오류:", error);
        return NextResponse.json({ error: "프로필 수정 중 오류가 발생했습니다." }, { status: 500 });
    }
}
