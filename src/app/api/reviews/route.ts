import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");
        const userId = searchParams.get("userId");

        let reviews;

        if (courseId) {
            // 특정 코스의 리뷰만 가져오기
            reviews = await prisma.review.findMany({
                where: { courseId: parseInt(courseId) },
                include: {
                    user: {
                        select: {
                            id: true,
                            nickname: true,
                        },
                    },
                },
            });
        } else if (userId) {
            // 특정 사용자의 리뷰만 가져오기
            reviews = await prisma.review.findMany({
                where: { userId: parseInt(userId) },
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });
        } else {
            // 모든 리뷰 가져오기
            reviews = await prisma.review.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            nickname: true,
                        },
                    },
                    course: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });
        }

        return NextResponse.json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, courseId, rating, comment } = body;

        const review = await prisma.review.create({
            data: {
                userId: parseInt(userId),
                courseId: parseInt(courseId),
                rating,
                comment,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        nickname: true,
                    },
                },
            },
        });

        // 코스의 평균 평점 업데이트
        const courseReviews = await prisma.review.findMany({
            where: { courseId: parseInt(courseId) },
            select: { rating: true },
        });

        const totalRating = courseReviews.reduce((sum: number, review: any) => sum + review.rating, 0);
        const averageRating = courseReviews.length > 0 ? totalRating / courseReviews.length : 0;

        await prisma.courses.update({
            where: { id: parseInt(courseId) },
            data: { rating: averageRating },
        });

        return NextResponse.json(review);
    } catch (error) {
        console.error("Error creating review:", error);
        return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
    }
}
