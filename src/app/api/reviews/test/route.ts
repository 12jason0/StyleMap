import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// 테스트용 후기 데이터 추가 (인증 불필요)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { courseId } = body;

        if (!courseId) {
            return NextResponse.json({ error: "courseId가 필요합니다." }, { status: 400 });
        }

        const created = await (prisma as any).review.create({
            data: {
                userId: 1,
                courseId: Number(courseId),
                rating: 5,
                comment: "정말 좋은 코스였습니다! 다음에 또 방문하고 싶어요.",
                createdAt: new Date(),
            },
            select: { id: true },
        });
        return NextResponse.json({
            success: true,
            message: "테스트 후기가 추가되었습니다.",
            reviewId: created.id,
        });
    } catch (error) {
        console.error("테스트 후기 추가 오류:", error);
        return NextResponse.json({ error: "테스트 후기 추가 중 오류가 발생했습니다." }, { status: 500 });
    }
}
