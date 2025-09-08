import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { extractBearerToken, verifyJwtAndGetUserId } from "@/lib/auth";

// 찜 목록 조회
export async function GET(request: NextRequest) {
    try {
        const token = extractBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = verifyJwtAndGetUserId(token);

        const connection = await pool.getConnection();

        try {
            const [favorites] = await connection.execute(
                `SELECT f.id, f.course_id, f.created_at, 
                        c.title, c.description, c.imageUrl, c.price, c.rating, c.concept
                 FROM user_favorites f
                 JOIN courses c ON f.course_id = c.id
                 WHERE f.user_id = ?
                 ORDER BY f.created_at DESC`,
                [userId]
            );

            return NextResponse.json(favorites);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching favorites:", error);
        return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
    }
}

// 찜 추가
export async function POST(request: NextRequest) {
    try {
        const token = extractBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = verifyJwtAndGetUserId(token);

        const body = await request.json();
        const { courseId } = body;

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            // 이미 찜한 코스인지 확인
            const [existing] = await connection.execute(
                "SELECT id FROM user_favorites WHERE user_id = ? AND course_id = ?",
                [userId, courseId]
            );

            if ((existing as Array<{ id: number }>).length > 0) {
                return NextResponse.json({ error: "Already favorited" }, { status: 400 });
            }

            // 찜 추가
            await connection.execute("INSERT INTO user_favorites (user_id, course_id) VALUES (?, ?)", [
                userId,
                courseId,
            ]);

            return NextResponse.json({ message: "Added to favorites" });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error adding favorite:", error);
        return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
    }
}

// 찜 삭제
export async function DELETE(request: NextRequest) {
    try {
        const token = extractBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = verifyJwtAndGetUserId(token);

        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            await connection.execute("DELETE FROM user_favorites WHERE user_id = ? AND course_id = ?", [
                userId,
                courseId,
            ]);

            return NextResponse.json({ message: "Removed from favorites" });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error removing favorite:", error);
        return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
    }
}
