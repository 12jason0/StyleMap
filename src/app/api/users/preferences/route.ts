import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 사용자 선호도를 생성하거나 업데이트합니다.
 */
export async function POST(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        // DB에 해당 사용자가 실제로 존재하는지 확인합니다.
        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
        });

        if (!user) {
            // 요청의 userId가 유효하지 않은 경우
            return NextResponse.json({ error: "존재하지 않는 사용자입니다." }, { status: 404 });
        }

        const body = await request.json();
        const { preferences } = body;

        // 사용자 선호도가 있으면 업데이트, 없으면 생성 (upsert)
        await prisma.userPreferences.upsert({
            where: { user_id: Number(userId) },
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
                user_id: Number(userId),
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

/**
 * 사용자 선호도를 조회합니다.
 */
export async function GET(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            // 로그인하지 않은 사용자는 선호도가 없으므로 null 반환
            return NextResponse.json(null);
        }

        // DB에 해당 사용자가 실제로 존재하는지 확인합니다. (POST와 동일한 로직)
        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
        });

        if (!user) {
            // 존재하지 않는 사용자의 선호도를 조회하려는 경우
            return NextResponse.json({ error: "존재하지 않는 사용자입니다." }, { status: 404 });
        }

        const preferenceRow = await prisma.userPreferences.findUnique({
            where: { user_id: Number(userId) },
        });

        if (!preferenceRow) {
            // 사용자는 존재하지만, 아직 선호도를 저장한 적이 없는 경우
            return NextResponse.json(null);
        }

        // preferences 필드가 JSON 타입이므로 타입 캐스팅
        const prefs = preferenceRow.preferences as any;

        // 저장된 값이 없을 경우를 대비하여 기본값(null 또는 빈 배열)을 설정하여 반환
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
