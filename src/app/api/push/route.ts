import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // ← 이렇게 변경!

export async function POST(req: NextRequest) {
    try {
        const { userId, pushToken, platform, subscribed } = await req.json();

        // 필수 값 확인
        if (!userId || !pushToken) {
            return NextResponse.json({ error: "userId와 pushToken이 필요합니다" }, { status: 400 });
        }

        // 푸시 토큰 저장 또는 업데이트
        const updateData: any = {
            token: pushToken,
            platform: platform || "expo",
            updatedAt: new Date(),
        };
        if (typeof subscribed === "boolean") updateData.subscribed = subscribed;

        const createData: any = {
            userId: parseInt(userId),
            token: pushToken,
            platform: platform || "expo",
        };
        if (typeof subscribed === "boolean") createData.subscribed = subscribed;

        const savedToken = await prisma.pushToken.upsert({
            where: { userId: parseInt(userId) },
            update: updateData,
            create: createData,
        });

        console.log("푸시 토큰 저장 성공:", savedToken);

        return NextResponse.json({
            success: true,
            message: "푸시 토큰이 저장되었습니다",
        });
    } catch (error) {
        console.error("푸시 토큰 저장 실패:", error);
        return NextResponse.json({ error: "푸시 토큰 저장 중 오류가 발생했습니다" }, { status: 500 });
    }
}
