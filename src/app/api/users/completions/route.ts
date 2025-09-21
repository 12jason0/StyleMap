import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import { getJwtSecret, getUserIdFromRequest } from "@/lib/auth";

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

export async function POST(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { courseId, title }: { courseId?: number | string; title?: string } = await request.json();
        const numericId = Number(courseId);
        if (!Number.isFinite(numericId)) return NextResponse.json({ error: "courseId가 필요합니다." }, { status: 400 });

        // 1) 신규 구조: CompletedCourse 테이블에 upsert
        try {
            const exists = await (prisma as any).completedCourse.findFirst({
                where: { userId, courseId: numericId },
                select: { id: true },
            });
            if (exists) {
                await (prisma as any).completedCourse.update({
                    where: { id: exists.id },
                    data: { completedAt: new Date() },
                });
            } else {
                await (prisma as any).completedCourse.create({
                    data: { userId, courseId: numericId, completedAt: new Date() },
                });
            }
        } catch (e) {
            // 2) 하위 호환: preferences JSON에도 기록 (테이블이 없거나 마이그레이션 전용 대비)
            const existing = await prisma.userPreferences.findUnique({
                where: { userId },
                select: { preferences: true },
            });
            const prefs = (existing?.preferences as any) || {};
            const now = new Date().toISOString();
            const list: any[] = Array.isArray(prefs.completedCourses) ? prefs.completedCourses : [];
            const idx = list.findIndex((x) => Number(x?.courseId) === numericId);
            const record = { courseId: numericId, title: title || null, completedAt: now };
            if (idx >= 0) list[idx] = { ...list[idx], ...record };
            else list.push(record);
            prefs.completedCourses = list;
            await prisma.userPreferences.upsert({
                where: { userId },
                update: { preferences: prefs },
                create: { userId, preferences: prefs },
            } as any);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "완료 저장 실패" }, { status: 500 });
    }
}

/**
 * 완료한 코스 목록 조회
 * preferences.completedCourses 에 저장된 courseId 목록을 기반으로 코스 요약 정보를 반환합니다.
 */
export async function GET(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json([], { status: 200 });

        // 1) 신규 구조: CompletedCourse 기반 조회
        try {
            const rows = await (prisma as any).completedCourse.findMany({
                where: { userId },
                orderBy: { completedAt: "desc" },
                include: { course: { include: { course_places: { include: { places: true } } } } },
            });

            const mapped = rows.map((row: any) => {
                const c = row.course || {};
                const firstPlace = c?.course_places?.[0]?.places || {};
                return {
                    course_id: c.id,
                    title: c.title || "제목 없음",
                    description: c.description || "",
                    imageUrl: c.imageUrl || firstPlace.imageUrl || "",
                    rating: Number(c.rating) || 0,
                    concept: c.concept || "",
                    completedAt: row.completedAt || null,
                };
            });
            return NextResponse.json(mapped);
        } catch (e) {
            // 2) 하위 호환: preferences JSON에서 조회
            const existing = await prisma.userPreferences.findUnique({
                where: { userId },
                select: { preferences: true },
            });
            const prefs = (existing?.preferences as any) || {};
            const list: Array<{ courseId: number; completedAt?: string | null; title?: string | null }> = Array.isArray(
                prefs.completedCourses
            )
                ? prefs.completedCourses
                : [];

            if (list.length === 0) return NextResponse.json([]);
            const ids = list.map((x) => Number(x.courseId)).filter((n) => Number.isFinite(n));
            if (ids.length === 0) return NextResponse.json([]);
            const courses = await (prisma as any).course.findMany({
                where: { id: { in: ids } },
                include: { course_places: { include: { places: true } } },
            });
            const byId: Record<number, any> = {};
            for (const c of courses) byId[c.id] = c;
            const result = list
                .filter((x) => byId[Number(x.courseId)])
                .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
                .map((rec) => {
                    const c = byId[Number(rec.courseId)];
                    const firstPlace = c?.course_places?.[0]?.places || {};
                    return {
                        course_id: c.id,
                        title: c.title || rec.title || "제목 없음",
                        description: c.description || "",
                        imageUrl: c.imageUrl || firstPlace.imageUrl || "",
                        rating: Number(c.rating) || 0,
                        concept: c.concept || "",
                        completedAt: rec.completedAt || null,
                    };
                });
            return NextResponse.json(result);
        }
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "completions get failed" }, { status: 500 });
    }
}
