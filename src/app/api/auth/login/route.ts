import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/lib/db";
export const dynamic = "force-dynamic";
import { getJwtSecret } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        // 입력 검증
        if (!email || !password) {
            return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
        }

        console.log("로그인 시도:", { email });

        // 사용자 조회 (Prisma)
        const found = await prisma.user.findUnique({ where: { email } } as any);
        if (!found) {
            console.log("사용자를 찾을 수 없음:", email);
            return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
        }

        const user = { id: found.id, email: found.email, password: found.password, nickname: found.username } as any;
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
                nickname: user.nickname,
            },
        };

        console.log("로그인 성공:", { userId: user.id, email: user.email });
        // httpOnly 쿠키에 토큰 저장
        const res = NextResponse.json(response);
        res.cookies.set("auth", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });
        return res;
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
