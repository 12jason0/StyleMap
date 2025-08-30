import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "stylemap-secret-key-2024-very-long-and-secure";

// JWT 토큰에서 사용자 ID 추출
const getUserIdFromToken = (request: NextRequest) => {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        return decoded.userId;
    } catch {
        return null;
    }
};

export async function POST(request: NextRequest) {
    try {
        const userId = getUserIdFromToken(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const body = await request.json();
        const { preferences } = body;

        const connection = await pool.getConnection();

        try {
            // 기존 선호도 확인
            const [existingPreferences] = await connection.execute(
                "SELECT id FROM user_preferences WHERE user_id = ?",
                [userId]
            );

            if (Array.isArray(existingPreferences) && existingPreferences.length > 0) {
                // 기존 선호도 업데이트
                await connection.execute(
                    `UPDATE user_preferences SET 
                    travel_style = ?, budget_range = ?, time_preference = ?, 
                    food_preference = ?, activity_level = ?, group_size = ?, 
                    interests = ?, location_preferences = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE user_id = ?`,
                    [
                        JSON.stringify(preferences.travelStyle || []),
                        preferences.budgetRange || null,
                        JSON.stringify(preferences.timePreference || []),
                        JSON.stringify(preferences.foodPreference || []),
                        preferences.activityLevel || null,
                        preferences.groupSize || null,
                        JSON.stringify(preferences.interests || []),
                        JSON.stringify(preferences.locationPreferences || []),
                        userId,
                    ]
                );
            } else {
                // 새로운 선호도 생성
                await connection.execute(
                    `INSERT INTO user_preferences 
                    (user_id, travel_style, budget_range, time_preference, food_preference, 
                     activity_level, group_size, interests, location_preferences) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        JSON.stringify(preferences.travelStyle || []),
                        preferences.budgetRange || null,
                        JSON.stringify(preferences.timePreference || []),
                        JSON.stringify(preferences.foodPreference || []),
                        preferences.activityLevel || null,
                        preferences.groupSize || null,
                        JSON.stringify(preferences.interests || []),
                        JSON.stringify(preferences.locationPreferences || []),
                    ]
                );
            }

            return NextResponse.json({
                success: true,
                message: "선호도가 저장되었습니다.",
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error saving preferences:", error);
        return NextResponse.json({ error: "선호도 저장 중 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const userId = getUserIdFromToken(request);
        if (!userId) {
            return NextResponse.json(null);
        }

        const connection = await pool.getConnection();

        try {
            const [preferences] = await connection.execute("SELECT * FROM user_preferences WHERE user_id = ?", [
                userId,
            ]);

            const preferencesArray = preferences as Array<{
                travel_style: string;
                budget_range: string;
                time_preference: string;
                food_preference: string;
                activity_level: string;
                group_size: string;
                interests: string;
                location_preferences: string;
            }>;

            if (preferencesArray.length === 0) {
                return NextResponse.json(null);
            }

            const userPrefs = preferencesArray[0];

            return NextResponse.json({
                travelStyle: userPrefs.travel_style ? JSON.parse(userPrefs.travel_style) : [],
                budgetRange: userPrefs.budget_range,
                timePreference: userPrefs.time_preference ? JSON.parse(userPrefs.time_preference) : [],
                foodPreference: userPrefs.food_preference ? JSON.parse(userPrefs.food_preference) : [],
                activityLevel: userPrefs.activity_level,
                groupSize: userPrefs.group_size,
                interests: userPrefs.interests ? JSON.parse(userPrefs.interests) : [],
                locationPreferences: userPrefs.location_preferences ? JSON.parse(userPrefs.location_preferences) : [],
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching preferences:", error);
        return NextResponse.json({ error: "선호도 조회 중 오류가 발생했습니다." }, { status: 500 });
    }
}
