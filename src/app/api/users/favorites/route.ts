import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
export const dynamic = "force-dynamic";

// 찜 목록 조회
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
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
        return NextResponse.json(favorites);
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
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
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
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
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
