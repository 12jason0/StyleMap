import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
    let connection;

    try {
        console.log("API: Starting to fetch courses...");

        // URL 파라미터에서 concept과 limit 가져오기
        const { searchParams } = new URL(request.url);
        const concept = searchParams.get("concept");
        const limit = searchParams.get("limit");

        // 데이터베이스 연결 시도
        connection = await pool.getConnection();
        console.log("API: Database connection successful");

        // 쿼리 실행 (컨셉 필터링 추가)
        let query = "SELECT *, COALESCE(view_count, 0) as view_count FROM courses";
        let params: string[] = [];

        if (concept) {
            query += " WHERE concept = ?";
            params.push(concept);
            console.log("API: Filtering by concept:", concept);
        }

        query += " ORDER BY view_count DESC, title ASC";

        if (limit) {
            query += " LIMIT ?";
            params.push(limit);
            console.log("API: Limiting results to:", limit);
        }

        const [courses] = await connection.execute(query, params);
        const coursesArray = courses as Array<{
            id: number;
            title: string;
            description: string;
            duration: string;
            region: string;
            price: string;
            imageUrl: string;
            concept: string;
            rating: number;
            current_participants: number;
            view_count: number;
        }>;

        console.log("API: Found courses:", coursesArray.length);
        console.log("API: First course:", coursesArray[0] || "No courses found");

        // 데이터 포맷팅
        const formattedCourses = coursesArray.map((course) => ({
            id: course.id.toString(),
            title: course.title || "제목 없음",
            description: course.description || "",
            duration: course.duration || "",
            location: course.region || "", // region 필드를 location으로 매핑
            price: course.price || "",
            imageUrl: course.imageUrl || "/images/foodtour.png",
            concept: course.concept || "",
            rating: Number(course.rating) || 0,
            reviewCount: 0, // 나중에 리뷰 테이블과 조인
            participants: course.current_participants || 0,
            viewCount: course.view_count || 0,
        }));

        console.log("API: Returning formatted courses:", formattedCourses.length);

        return NextResponse.json(formattedCourses, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorCode = (error as { code?: string })?.code;
        const errorSqlState = (error as { sqlState?: string })?.sqlState;
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error("API: Detailed error:", {
            message: errorMessage,
            code: errorCode,
            sqlState: errorSqlState,
            stack: errorStack,
        });

        // 연결 오류인지 쿼리 오류인지 구분
        if (errorCode === "ECONNREFUSED") {
            return NextResponse.json(
                { error: "데이터베이스 연결 실패", details: "DB 서버가 실행중인지 확인해주세요" },
                { status: 503 }
            );
        } else if (errorCode === "ER_NO_SUCH_TABLE") {
            return NextResponse.json(
                { error: "테이블이 존재하지 않음", details: "courses 테이블을 생성해주세요" },
                { status: 500 }
            );
        } else {
            return NextResponse.json(
                { error: "코스 데이터를 가져오는 중 오류 발생", details: errorMessage },
                { status: 500 }
            );
        }
    } finally {
        // 연결 해제
        if (connection) {
            try {
                connection.release();
                console.log("API: Database connection released");
            } catch (releaseError) {
                console.error("API: Error releasing connection:", releaseError);
            }
        }
    }
}

export async function POST(request: NextRequest) {
    let connection;

    try {
        const body = await request.json();
        const { title, description, duration, location, price, imageUrl, concept } = body;

        // 입력값 검증
        if (!title) {
            return NextResponse.json({ error: "제목은 필수입니다" }, { status: 400 });
        }

        connection = await pool.getConnection();

        const [result] = await connection.execute(
            "INSERT INTO courses (title, description, duration, region, price, imageUrl, concept) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                title,
                description || null,
                duration || null,
                location || null,
                price || null,
                imageUrl || null,
                concept || null,
            ]
        );

        const insertResult = result as { insertId: number };
        const courseId = insertResult.insertId;

        const newCourse = {
            id: courseId.toString(),
            title,
            description: description || "",
            duration: duration || "",
            location: location || "",
            price: price || "",
            imageUrl: imageUrl || "/images/default-course.jpg",
            concept: concept || "",
            rating: 0,
            reviewCount: 0,
            participants: 0,
        };

        return NextResponse.json(newCourse, { status: 201 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("코스 생성 오류:", error);
        return NextResponse.json({ error: "코스 생성 실패", details: errorMessage }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
