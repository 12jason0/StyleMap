import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = "stylemap-secret-key-2024";

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 401 });
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;

            return NextResponse.json({
                valid: true,
                user: {
                    userId: decoded.userId,
                    email: decoded.email,
                    name: decoded.name,
                },
            });
        } catch (jwtError) {
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }
    } catch (error) {
        console.error("토큰 검증 오류:", error);
        return NextResponse.json({ error: "토큰 검증 중 오류가 발생했습니다." }, { status: 500 });
    }
}
