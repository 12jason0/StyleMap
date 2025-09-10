import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const body = await request.json();
        const { preferences } = body;

        // upsert: 있으면 업데이트, 없으면 생성
        await (prisma as any).user_preferences.upsert({
            where: { userId: String(userId) },
            update: {
                preferences: {
                    travelStyle: preferences.travelStyle || [],
                    budgetRange: preferences.budgetRange || null,
                    timePreference: preferences.timePreference || [],
                    foodPreference: preferences.foodPreference || [],
                    activityLevel: preferences.activityLevel || null,
                    groupSize: preferences.groupSize || null,
                    interests: preferences.interests || [],
                    locationPreferences: preferences.locationPreferences || [],
                },
            },
            create: {
                userId: String(userId),
                preferences: {
                    travelStyle: preferences.travelStyle || [],
                    budgetRange: preferences.budgetRange || null,
                    timePreference: preferences.timePreference || [],
                    foodPreference: preferences.foodPreference || [],
                    activityLevel: preferences.activityLevel || null,
                    groupSize: preferences.groupSize || null,
                    interests: preferences.interests || [],
                    locationPreferences: preferences.locationPreferences || [],
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: "선호도가 저장되었습니다.",
        });
    } catch (error) {
        console.error("Error saving preferences:", error);
        return NextResponse.json({ error: "선호도 저장 중 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json(null);
        }

        const row = await (prisma as any).user_preferences.findUnique({ where: { userId: String(userId) } });
        if (!row) return NextResponse.json(null);
        const prefs = row.preferences as any;
        return NextResponse.json({
            travelStyle: prefs?.travelStyle ?? [],
            budgetRange: prefs?.budgetRange ?? null,
            timePreference: prefs?.timePreference ?? [],
            foodPreference: prefs?.foodPreference ?? [],
            activityLevel: prefs?.activityLevel ?? null,
            groupSize: prefs?.groupSize ?? null,
            interests: prefs?.interests ?? [],
            locationPreferences: prefs?.locationPreferences ?? [],
        });
    } catch (error) {
        console.error("Error fetching preferences:", error);
        return NextResponse.json({ error: "선호도 조회 중 오류가 발생했습니다." }, { status: 500 });
    }
}
