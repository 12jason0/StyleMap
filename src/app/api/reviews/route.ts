import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");
        const userId = searchParams.get("userId");
        const limit = Math.min(Number(searchParams.get("limit") || "10"), 50);
        const offset = Number(searchParams.get("offset") || "0");

        const whereClause: any = {};
        if (courseId) {
            whereClause.courseId = Number(courseId);
        }
        if (userId) {
            whereClause.userId = Number(userId);
        }

        // 🚨 중요: about 페이지처럼 courseId, userId가 없는 경우를 허용하기 위해
        // 아래 조건문을 제거하거나 주석 처리합니다.
        /* if (!courseId && !userId) {
            return NextResponse.json({ error: "courseId 또는 userId가 필요합니다." }, { status: 400 });
        }
        */

        const reviews = await prisma.review.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        username: true,
                        profileImageUrl: true,
                    },
                },
                course: {
                    select: {
                        title: true,
                        concept: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
            skip: offset,
        });

        const formatted = (reviews || []).map((r) => ({
            id: r.id,
            courseId: r.courseId,
            userId: r.userId,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            user: {
                nickname: r.user?.username || "익명",
                initial: (r.user?.username?.[0] || "U").toUpperCase(),
                profileImageUrl: r.user?.profileImageUrl || "/images/maker.png",
            },
            course: r.course
                ? {
                      title: r.course.title,
                      concept: (r.course as any).concept || "",
                  }
                : undefined,
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("API: /api/reviews failed, returning empty list:", message);
        // 🚨 중요: 오류 발생 시 500 대신 200과 빈 배열을 반환
        return NextResponse.json([], { status: 200, headers: { "X-Error": String(message) } });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const body = await request.json();
        const { courseId, rating, comment, content } = body;

        if (!courseId || !rating) {
            return NextResponse.json({ error: "courseId와 rating은 필수입니다." }, { status: 400 });
        }

        // --- 👇 여기에 유효성 검사 추가 ---
        const numericUserId = Number(userId);
        const numericCourseId = Number(courseId);
        const numericRating = Number(rating);

        if (!Number.isFinite(numericUserId) || !Number.isFinite(numericCourseId) || !Number.isFinite(numericRating)) {
            return NextResponse.json({ error: "유효하지 않은 데이터 타입입니다." }, { status: 400 });
        }
        // --- 👆 여기까지 추가 ---

        const finalComment: string =
            typeof comment === "string" && comment.trim().length > 0
                ? comment.trim()
                : typeof content === "string"
                ? content.trim()
                : "";

        const newReview = await prisma.review.create({
            data: {
                userId: numericUserId,
                courseId: numericCourseId,
                rating: numericRating,
                comment: finalComment,
            },
        });

        return NextResponse.json(newReview, { status: 201 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("리뷰 생성 오류:", error);
        return NextResponse.json({ error: "리뷰 생성 실패", details: errorMessage }, { status: 500 });
    }
}
