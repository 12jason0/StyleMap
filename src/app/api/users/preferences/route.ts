import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        // ✅ [수정됨] prisma.user_preferences -> prisma.userPreference
        const preferences = await prisma.userPreference.findUnique({
            where: { userId: Number(userId) },
        });

        if (!preferences) {
            return NextResponse.json({ preferences: {} }, { status: 200 });
        }

        return NextResponse.json(preferences);
    } catch (error) {
        console.error("사용자 선호도 가져오기 오류:", error);
        return NextResponse.json({ error: "사용자 선호도를 가져오는 중 오류 발생" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const body = await request.json();

        // ✅ [수정됨] prisma.user_preferences -> prisma.userPreference
        const updatedPreferences = await prisma.userPreference.upsert({
            where: { userId: Number(userId) },
            update: { preferences: body },
            create: {
                userId: Number(userId),
                preferences: body,
            },
        });

        return NextResponse.json(updatedPreferences, { status: 200 });
    } catch (error) {
        console.error("사용자 선호도 저장 오류:", error);
        return NextResponse.json({ error: "사용자 선호도 저장 중 오류 발생" }, { status: 500 });
    }
}
