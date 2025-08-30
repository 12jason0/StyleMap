import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const { email, password, nickname } = await request.json();
        console.log("회원가입 시도:", { email, nickname });

        // 입력 검증
        if (!email || !password || !nickname) {
            return NextResponse.json({ error: "이메일, 비밀번호, 닉네임을 모두 입력해주세요." }, { status: 400 });
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "올바른 이메일 형식을 입력해주세요." }, { status: 400 });
        }

        // 비밀번호 길이 검증
        if (password.length < 6) {
            return NextResponse.json({ error: "비밀번호는 최소 6자 이상이어야 합니다." }, { status: 400 });
        }

        const connection = await pool.getConnection();
        console.log("DB 연결 성공");

        try {
            // 이메일 중복 확인 (닉네임은 중복 허용)
            console.log("이메일 중복 확인 시작");
            const [existingUsers] = await connection.execute("SELECT id FROM users WHERE email = ?", [email]);

            if (Array.isArray(existingUsers) && existingUsers.length > 0) {
                console.log("이미 사용 중인 이메일:", email);
                return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
            }

            console.log("이메일 중복 없음, 회원가입 진행 (닉네임 중복 허용)");

            // 비밀번호 해시화
            console.log("비밀번호 해시화 시작");
            const hashedPassword = await bcrypt.hash(password, 12);
            console.log("비밀번호 해시화 완료");

            // 사용자 생성
            console.log("사용자 생성 시작");
            const [result] = await connection.execute(
                "INSERT INTO users (email, password, nickname, provider) VALUES (?, ?, ?, ?)",
                [email, hashedPassword, nickname, "local"]
            );
            console.log("사용자 생성 완료:", result);

            const insertResult = result as { insertId: number };
            const userId = insertResult.insertId;

            // JWT 토큰 생성
            const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "your-secret-key";
            const token = jwt.sign({ userId, email, nickname }, JWT_SECRET, { expiresIn: "7d" });

            return NextResponse.json({
                success: true,
                message: "회원가입이 완료되었습니다.",
                token,
                user: {
                    id: userId,
                    email,
                    nickname,
                },
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("회원가입 오류:", error);
        console.error("에러 상세:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        return NextResponse.json(
            {
                error: "회원가입 중 오류가 발생했습니다.",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
