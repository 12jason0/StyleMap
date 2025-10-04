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

        // ✅ [수정됨] prisma.CompletedCourses, prisma.CompletedEscapes -> prisma.completedCourse, prisma.completedEscape
        const completedCourses = await prisma.completedCourse.findMany({
            where: { userId: Number(userId) },
            include: { course: true },
        });

        const completedEscapes = await prisma.completedEscape.findMany({
            where: { userId: Number(userId) },
            include: { story: true },
        });

        return NextResponse.json({
            courses: completedCourses,
            escapes: completedEscapes,
        });
    } catch (error) {
        return NextResponse.json({ error: "완료 목록을 가져오는 중 오류 발생" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }
        const body = await request.json().catch(() => ({}));
        const courseIdRaw = body?.courseId ?? body?.course_id ?? body?.id;
        const title: string | undefined = body?.title;
        const courseId = Number(courseIdRaw);
        if (!Number.isFinite(courseId)) {
            return NextResponse.json({ error: "유효한 courseId가 필요합니다." }, { status: 400 });
        }

        // 이미 완료했는지 확인
        const existing = await prisma.completedCourse.findFirst({
            where: { userId: Number(userId), courseId: courseId },
        });
        if (existing) {
            return NextResponse.json({ success: true, already: true });
        }

        const created = await prisma.completedCourse.create({
            data: {
                userId: Number(userId),
                courseId: courseId,
            },
            include: { course: true },
        });

        return NextResponse.json({ success: true, item: created });
    } catch (error) {
        return NextResponse.json({ error: "코스 완료 저장 중 오류 발생" }, { status: 500 });
    }
}
