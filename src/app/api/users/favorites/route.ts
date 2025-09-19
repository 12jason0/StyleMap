import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/auth";
export const dynamic = "force-dynamic";

// 찜 목록 조회
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
        const userId = decoded.userId;

        const favorites = await (prisma as any).userFavorite.findMany({
            where: { user_id: Number(userId) },
            orderBy: { created_at: "desc" },
            include: {
                course: {
                    select: {
                        title: true,
                        description: true,
                        imageUrl: true,
                        price: true,
                        rating: true,
                        concept: true,
                    },
                },
            },
        });
        // 프론트에서 기대하는 평탄화된 형태로 변환
        const mapped = favorites.map((f: any) => ({
            id: f.id,
            course_id: f.course_id,
            created_at: f.created_at,
            title: f.course?.title ?? null,
            description: f.course?.description ?? null,
            imageUrl: f.course?.imageUrl ?? null,
            price: f.course?.price ?? null,
            rating: f.course?.rating ?? null,
            concept: f.course?.concept ?? null,
        }));
        return NextResponse.json(mapped);
    } catch (error) {
        console.error("Error fetching favorites:", error);
        return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
    }
}

// 찜 추가
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
        const userId = decoded.userId;

        const body = await request.json();
        const { courseId } = body;

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        const existing = await (prisma as any).userFavorite.findFirst({
            where: { user_id: Number(userId), course_id: Number(courseId) },
        });
        if (existing) return NextResponse.json({ error: "Already favorited" }, { status: 400 });
        await (prisma as any).userFavorite.create({ data: { user_id: Number(userId), course_id: Number(courseId) } });
        return NextResponse.json({ message: "Added to favorites" });
    } catch (error) {
        console.error("Error adding favorite:", error);
        return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
    }
}

// 찜 삭제
export async function DELETE(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
        const userId = decoded.userId;

        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        await (prisma as any).userFavorite.deleteMany({
            where: { user_id: Number(userId), course_id: Number(courseId) },
        });
        return NextResponse.json({ message: "Removed from favorites" });
    } catch (error) {
        console.error("Error removing favorite:", error);
        return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
    }
}
