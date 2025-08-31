import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
    let connection;

    try {
        console.log("API: Starting to fetch reviews...");

        // URL 파라미터에서 limit 가져오기
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get("limit");

        // 데이터베이스 연결 시도
        connection = await pool.getConnection();
        console.log("API: Database connection successful");

        // 리뷰와 사용자 정보를 조인해서 가져오기
        let query = `
            SELECT r.*, u.nickname, c.title as course_title, c.concept
            FROM reviews r
            LEFT JOIN users u ON r.userId = u.id
            LEFT JOIN courses c ON r.courseId = c.id
            ORDER BY r.createdAt DESC
        `;
        let params: string[] = [];

        if (limit) {
            query += " LIMIT ?";
            params.push(limit);
            console.log("API: Limiting results to:", limit);
        }

        const [reviews] = await connection.execute(query, params);
        const reviewsArray = reviews as Array<{
            id: number;
            userId: number;
            courseId: number;
            rating: number;
            content: string;
            createdAt: string;
            nickname: string;
            course_title: string;
            concept: string;
        }>;

        console.log("API: Found reviews:", reviewsArray.length);

        // 데이터 포맷팅
        const formattedReviews = reviewsArray.map((review) => ({
            id: review.id.toString(),
            userId: review.userId.toString(),
            courseId: review.courseId.toString(),
            rating: review.rating,
            comment: review.content || "",
            createdAt: review.createdAt,
            user: {
                nickname: review.nickname || "익명",
                initial: (review.nickname || "익")[0],
            },
            course: {
                title: review.course_title || "알 수 없는 코스",
                concept: review.concept || "기타",
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

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorCode = (error as { code?: string })?.code;

        // 연결 오류인지 쿼리 오류인지 구분
        if (errorCode === "ECONNREFUSED") {
            return NextResponse.json(
                { error: "데이터베이스 연결 실패", details: "DB 서버가 실행중인지 확인해주세요" },
                { status: 503 }
            );
        } else if (errorCode === "ER_NO_SUCH_TABLE") {
            return NextResponse.json(
                { error: "테이블이 존재하지 않음", details: "reviews 테이블을 생성해주세요" },
                { status: 500 }
            );
        } else {
            return NextResponse.json(
                { error: "리뷰 데이터를 가져오는 중 오류 발생", details: errorMessage },
                { status: 500 }
            );
        }
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
