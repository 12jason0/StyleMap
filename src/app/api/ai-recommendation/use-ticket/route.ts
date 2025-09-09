import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { extractBearerToken, verifyJwtAndGetUserId } from "@/lib/auth";
import { generateMLRecommendations } from "@/lib/ml/deepLearningRecommender";

export async function POST(request: NextRequest) {
    try {
        // JWT 토큰 검증
        const token = extractBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
        }

        let userId: string;
        try {
            userId = verifyJwtAndGetUserId(token);
        } catch {
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }
        const row = await (prisma as any).ai_recommendation_tickets.findUnique({
            where: { user_id: Number(userId) },
            select: { tickets_remaining: true },
        });
        if (!row) return NextResponse.json({ error: "AI 추천 티켓이 없습니다." }, { status: 404 });
        if ((row.tickets_remaining as number) <= 0) {
            return NextResponse.json({ error: "사용 가능한 AI 추천 티켓이 없습니다." }, { status: 400 });
        }

        await (prisma as any).ai_recommendation_tickets.update({
            where: { user_id: Number(userId) },
            data: { tickets_remaining: { decrement: 1 } },
        });

        return NextResponse.json({
            success: true,
            message: "AI 추천 티켓이 사용되었습니다.",
            ticketsRemaining: (row.tickets_remaining as number) - 1,
            recommendation: { message: "AI가 당신을 위한 맞춤 코스를 추천합니다!" },
        });
    } catch {
        console.error("AI 추천 티켓 사용 오류");
        return NextResponse.json({ error: "AI 추천 티켓 사용 중 오류가 발생했습니다." }, { status: 500 });
    }
}
