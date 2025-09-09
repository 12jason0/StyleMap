import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        console.log("API: Starting to fetch reviews...");

        // URL 파라미터에서 limit 가져오기
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get("limit");

        const reviewsArray = (await (prisma as any).review.findMany({
            take: limit ? Number(limit) : undefined,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { nickname: true } },
                course: { select: { title: true, concept: true } },
            },
        })) as any[];

        console.log("API: Found reviews:", reviewsArray.length);

        // 데이터 포맷팅
        const formattedReviews = reviewsArray.map((review) => ({
            id: review.id.toString(),
            userId: String(review.userId),
            courseId: String(review.courseId),
            rating: review.rating,
            comment: review.content || "",
            createdAt: review.createdAt,
            user: {
                nickname: review.user?.nickname || "익명",
                initial: (review.user?.nickname || "익")[0],
            },
            course: {
                title: review.course?.title || "알 수 없는 코스",
                concept: review.course?.concept || "기타",
            },
        }));

        console.log("API: Returning formatted reviews:", formattedReviews.length);

        return NextResponse.json(formattedReviews, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // 5분 캐시, 10분 stale-while-revalidate
            },
        });
    } catch (error) {
        console.error("API: Error fetching reviews:", error);
        return NextResponse.json({ error: "리뷰 데이터를 가져오는 중 오류 발생" }, { status: 500 });
    }
}
