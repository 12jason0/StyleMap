import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest, getJwtSecret } from "@/lib/auth";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

function resolveUserId(request: NextRequest): number | null {
    const fromHeader = getUserIdFromRequest(request);
    if (fromHeader && Number.isFinite(Number(fromHeader))) return Number(fromHeader);
    const token = request.cookies.get("auth")?.value;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, getJwtSecret()) as { userId?: number | string };
        if (payload?.userId) return Number(payload.userId);
    } catch {}
    return null;
}

// 👇 추가된 GET 핸들러
export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        // 비로그인 사용자는 빈 배열 반환(클라이언트 에러 방지)
        if (!userId) return NextResponse.json([], { status: 200 });

        const favorites = await (prisma as any).userFavorite.findMany({
            where: {
                user_id: userId,
            },
            include: {
                course: true, // 강좌 정보 포함
            },
        });

        return NextResponse.json(favorites);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "An error occurred" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }
        const body = await request.json();
        const courseId = Number(body.courseId);

        if (!Number.isFinite(courseId)) {
            return NextResponse.json({ error: "courseId가 필요합니다." }, { status: 400 });
        }

        const existing = await (prisma as any).userFavorite.findFirst({
            where: { user_id: userId, course_id: courseId },
        });

        if (existing) {
            return NextResponse.json({ error: "Already favorited" }, { status: 409 });
        }

        await (prisma as any).userFavorite.create({
            data: {
                user_id: userId,
                course_id: courseId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "create error" }, { status: 500 });
    }
}
export async function DELETE(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json({ success: true });
        const { searchParams } = new URL(request.url);
        const courseId = Number(searchParams.get("courseId"));
        if (!Number.isFinite(courseId)) return NextResponse.json({ success: true });
        await (prisma as any).userFavorite.deleteMany({ where: { user_id: userId, course_id: courseId } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "delete error" }, { status: 500 });
    }
}
