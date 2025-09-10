import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/lib/db";
import { getJwtSecret } from "@/lib/auth";
export const dynamic = "force-dynamic";

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

        // 이메일 중복 확인
        const existing = await (prisma as any).user.findFirst({ where: { email }, select: { id: true } });
        if (existing) return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });

        const hashedPassword = await bcrypt.hash(password, 12);
        const created = await (prisma as any).user.create({
            data: { email, password: hashedPassword, nickname, provider: "local" },
            select: { id: true, email: true, nickname: true },
        });

        const JWT_SECRET = getJwtSecret();
        const token = jwt.sign({ userId: created.id, email, nickname }, JWT_SECRET, { expiresIn: "7d" });

        return NextResponse.json({
            success: true,
            message: "회원가입이 완료되었습니다.",
            token,
            user: { id: created.id, email, nickname },
        });
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
