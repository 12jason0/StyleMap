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

export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json([], { status: 200 });

        const rows = await (prisma as any).userFavorite.findMany({
            where: { user_id: userId },
            orderBy: { created_at: "desc" },
            include: {
                course: {
                    include: { course_places: { include: { places: true } } },
                },
            },
        });

        const data = rows.map((row: any) => {
            const c = row.course || {};
            const firstPlace = c.course_places?.[0]?.places || {};
            return {
                id: row.id,
                course_id: c.id,
                title: c.title || "제목 없음",
                description: c.description || "",
                imageUrl: c.imageUrl || firstPlace.imageUrl || "",
                price: c.price || "",
                rating: Number(c.rating) || 0,
                concept: c.concept || "",
                created_at: row.created_at,
            };
        });

        return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "favorites error" }, { status: 500 });
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
