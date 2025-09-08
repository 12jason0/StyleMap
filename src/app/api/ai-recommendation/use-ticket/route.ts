import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { generateMLRecommendations } from "@/lib/ml/deepLearningRecommender";

export async function POST(request: NextRequest) {
    try {
        // JWT 토큰 검증
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "your-secret-key";

        let decoded: { userId: string };
        try {
            decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        } catch {
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }

        const userId = decoded.userId;
        const connection = await pool.getConnection();

        try {
            // 사용자의 AI 추천 티켓 확인
            const [tickets] = await connection.execute(
                "SELECT tickets_remaining FROM ai_recommendation_tickets WHERE user_id = ?",
                [userId]
            );

            const ticketsArray = tickets as Array<{ tickets_remaining: number }>;

            if (ticketsArray.length === 0) {
                return NextResponse.json({ error: "AI 추천 티켓이 없습니다." }, { status: 404 });
            }

            const ticket = ticketsArray[0];

            if (ticket.tickets_remaining <= 0) {
                return NextResponse.json({ error: "사용 가능한 AI 추천 티켓이 없습니다." }, { status: 400 });
            }

            // 티켓 사용
            await connection.execute(
                "UPDATE ai_recommendation_tickets SET tickets_remaining = tickets_remaining - 1 WHERE user_id = ?",
                [userId]
            );

            // 여기에 실제 AI 추천 로직을 추가할 수 있습니다
            // 현재는 성공 응답만 반환
            return NextResponse.json({
                success: true,
                message: "AI 추천 티켓이 사용되었습니다.",
                ticketsRemaining: ticket.tickets_remaining - 1,
                recommendation: {
                    message: "AI가 당신을 위한 맞춤 코스를 추천합니다!",
                    // 실제 AI 추천 결과를 여기에 추가
                },
            });
        } finally {
            connection.release();
        }
    } catch {
        console.error("AI 추천 티켓 사용 오류");
        return NextResponse.json({ error: "AI 추천 티켓 사용 중 오류가 발생했습니다." }, { status: 500 });
    }
}
