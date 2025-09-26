import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");
        const userId = searchParams.get("userId");
        const limit = Number(searchParams.get("limit") || "10");
        const offset = Number(searchParams.get("offset") || "0");

        if (!courseId && !userId) {
            return NextResponse.json({ error: "courseId 또는 userId가 필요합니다." }, { status: 400 });
        }

        const whereClause: any = {};
        if (courseId) {
            whereClause.courseId = Number(courseId);
        }
        if (userId) {
            whereClause.userId = Number(userId);
        }

        // ✅ [수정됨] prisma.reviews -> prisma.review (단수형)
        const reviews = await prisma.review.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        username: true,
                        profileImageUrl: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
            skip: offset,
        });

        const formatted = reviews.map((r) => ({
            ...r,
            user: {
                ...r.user,
                name: r.user.username,
                profileImageUrl: r.user.profileImageUrl || "/images/maker.png",
            },
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        return NextResponse.json(
            {
                error: "리뷰 데이터를 가져오는 중 오류 발생",
                details: error instanceof Error ? error.message : "알 수 없는 오류",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const body = await request.json();
        // 클라이언트는 content로 보낼 수 있으므로 별칭 처리
        const { courseId, rating, comment, content, placeId } = body;

        if (!courseId || !rating) {
            return NextResponse.json({ error: "courseId와 rating은 필수입니다." }, { status: 400 });
        }

        const finalComment: string =
            typeof comment === "string" && comment.trim().length > 0
                ? comment.trim()
                : typeof content === "string"
                ? content.trim()
                : "";

        // ✅ [수정됨] prisma.reviews -> prisma.review (단수형)
        const newReview = await prisma.review.create({
            data: {
                userId: Number(userId),
                courseId: Number(courseId),
                rating: Number(rating),
                comment: finalComment,
            },
        });

        return NextResponse.json(newReview, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "리뷰 생성 실패" }, { status: 500 });
    }
}
