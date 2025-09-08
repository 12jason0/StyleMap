import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { getJwtSecret } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        // 입력 검증
        if (!email || !password) {
            return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
        }

        console.log("로그인 시도:", { email });

        const connection = await pool.getConnection();
        console.log("DB 연결 성공");

        try {
            // 사용자 조회
            console.log("사용자 조회 시작");
            const [users] = await connection.execute(
                "SELECT id, email, password, nickname FROM users WHERE email = ?",
                [email]
            );
            console.log("사용자 조회 결과:", users);

            const userArray = users as Array<{ id: number; email: string; password: string; nickname: string }>;

            if (userArray.length === 0) {
                console.log("사용자를 찾을 수 없음:", email);
                return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
            }

            const user = userArray[0];
            console.log("사용자 찾음:", { id: user.id, email: user.email, nickname: user.nickname });

            // 비밀번호 검증
            console.log("비밀번호 검증 시작");
            const isPasswordValid = await bcrypt.compare(password, user.password);
            console.log("비밀번호 검증 결과:", isPasswordValid);

            if (!isPasswordValid) {
                console.log("비밀번호 불일치");
                return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
            }

            // JWT 토큰 생성
            console.log("JWT 토큰 생성 시작");
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    name: user.nickname,
                },
                getJwtSecret(),
                { expiresIn: "7d" }
            );
            console.log("JWT 토큰 생성 완료");

            const response = {
                success: true,
                message: "로그인이 완료되었습니다.",
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.nickname,
                },
            };

            console.log("로그인 성공:", { userId: user.id, email: user.email });
            return NextResponse.json(response);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("로그인 오류:", error);
        console.error("에러 상세:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        return NextResponse.json(
            {
                error: "로그인 중 오류가 발생했습니다.",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
