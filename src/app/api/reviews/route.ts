import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-for-development";

// 후기 목록 가져오기 (인증 불필요)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");
        const placeId = searchParams.get("placeId");

        console.log("후기 목록 요청:", { courseId, placeId });

        if (!courseId && !placeId) {
            return NextResponse.json({ error: "courseId 또는 placeId가 필요합니다." }, { status: 400 });
        }

        const connection = await pool.getConnection();
        console.log("데이터베이스 연결 성공");

        try {
            // 먼저 reviews 테이블이 존재하는지 확인
            const [tables] = await connection.execute("SHOW TABLES LIKE 'reviews'");
            console.log("reviews 테이블 존재 여부:", (tables as any[]).length > 0);

            if ((tables as any[]).length === 0) {
                console.log("reviews 테이블이 존재하지 않습니다.");
                return NextResponse.json({
                    success: true,
                    reviews: [],
                });
            }

            // 테이블 구조 확인
            const [columns] = await connection.execute("DESCRIBE reviews");
            console.log("reviews 테이블 컬럼:", columns);

            // users 테이블도 존재하는지 확인
            const [userTables] = await connection.execute("SHOW TABLES LIKE 'users'");
            console.log("users 테이블 존재 여부:", (userTables as any[]).length > 0);

            if ((userTables as any[]).length === 0) {
                console.log("users 테이블이 존재하지 않습니다.");
                return NextResponse.json({
                    success: true,
                    reviews: [],
                });
            }

            // 먼저 단순한 쿼리로 테스트
            let query = "SELECT * FROM reviews WHERE 1=1";
            const params: any[] = [];

            if (courseId) {
                query += " AND courseId = ?";
                params.push(parseInt(courseId));
            } else if (placeId) {
                query += " AND placeId = ?";
                params.push(parseInt(placeId));
            }

            query += " ORDER BY createdAt DESC";

            console.log("실행할 쿼리:", query, "파라미터:", params);

            const [reviews] = await connection.execute(query, params);

            console.log("조회된 후기 수:", (reviews as any[]).length);

            // 사용자 정보는 나중에 별도로 조회하거나 기본값 사용
            const reviewsWithUser = (reviews as any[]).map((review: any) => ({
                ...review,
                userName: "익명", // 기본값
                userEmail: null,
            }));

            return NextResponse.json({
                success: true,
                reviews: reviewsWithUser,
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("후기 목록 조회 오류:", error);
        console.error("오류 상세:", error instanceof Error ? error.message : error);
        return NextResponse.json({ error: "후기 목록을 가져오는 중 오류가 발생했습니다." }, { status: 500 });
    }
}

// 후기 작성
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { courseId, placeId, rating, content } = body;

        // JWT_SECRET 확인
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET이 설정되지 않았습니다.");
            return NextResponse.json({ error: "서버 설정 오류입니다. 관리자에게 문의하세요." }, { status: 500 });
        }

        // JWT 토큰에서 사용자 ID 추출
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        const userId = decoded.userId;

        // 필수 필드 검증
        if (!rating || !content) {
            return NextResponse.json({ error: "평점과 내용을 입력해주세요." }, { status: 400 });
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json({ error: "평점은 1-5 사이의 값이어야 합니다." }, { status: 400 });
        }

        if (content.trim().length < 10) {
            return NextResponse.json({ error: "후기 내용은 최소 10자 이상 입력해주세요." }, { status: 400 });
        }

        // courseId 또는 placeId 중 하나는 반드시 있어야 함
        if (!courseId && !placeId) {
            return NextResponse.json({ error: "코스 또는 장소 정보가 필요합니다." }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            // 기존 후기 확인 (같은 사용자가 같은 코스/장소에 후기를 작성했는지)
            let existingReview;
            if (courseId) {
                [existingReview] = await connection.execute(
                    "SELECT id FROM reviews WHERE userId = ? AND courseId = ?",
                    [userId, courseId]
                );
            } else if (placeId) {
                [existingReview] = await connection.execute("SELECT id FROM reviews WHERE userId = ? AND placeId = ?", [
                    userId,
                    placeId,
                ]);
            }

            if (existingReview && (existingReview as any[]).length > 0) {
                return NextResponse.json({ error: "이미 후기를 작성하셨습니다." }, { status: 409 });
            }

            // 새 후기 저장
            const [result] = await connection.execute(
                `INSERT INTO reviews (userId, courseId, placeId, rating, content, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                [userId, courseId || null, placeId || null, rating, content.trim()]
            );

            const insertResult = result as any;

            return NextResponse.json({
                success: true,
                message: "후기가 성공적으로 작성되었습니다.",
                reviewId: insertResult.insertId,
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("후기 작성 오류:", error);

        if (error instanceof jwt.JsonWebTokenError) {
            return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
        }

        return NextResponse.json({ error: "후기 작성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
