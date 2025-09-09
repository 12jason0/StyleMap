import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
    let connection;

    try {
        console.log("API: Starting to fetch courses...");

        // URL 파라미터에서 concept과 limit 가져오기
        const { searchParams } = new URL(request.url);
        const concept = searchParams.get("concept");
        const limitParam = searchParams.get("limit");
        const effectiveLimit = Math.min(Math.max(Number(limitParam ?? 100), 1), 200);

        // 데이터베이스 연결 시도
        connection = await pool.getConnection();
        await connection.query("SET SESSION max_execution_time=15000");
        console.log("API: Database connection successful");

        // 쿼리 실행 (컨셉 필터링 + 장소 이미지 없는 코스 제외)
        // 일부 환경에서 view_count 컬럼이 없을 수 있으므로 COALESCE를 제거하고 매핑 단계에서 기본값 처리
        let query =
            "SELECT id, title, description, duration, location, price, imageUrl, concept, rating, current_participants, view_count FROM courses";
        const conditions: string[] = [];
        const params: (string | number)[] = [];

        if (concept) {
            conditions.push("concept = ?");
            params.push(concept);
            console.log("API: Filtering by concept:", concept);
        }

        // 장소 이미지가 없는 개수가 0개 또는 1개인 코스만 포함 (places.imageUrl 기준)
        conditions.push(
            "(SELECT COUNT(*) FROM course_places cp JOIN places p ON p.id = cp.place_id WHERE cp.course_id = courses.id AND (p.imageUrl IS NULL OR p.imageUrl = '')) <= 1"
        );

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
        }

        query += " ORDER BY id DESC, title ASC";

        // 결과 개수 제한 (기본 100, 최대 200)
        // 일부 MySQL 환경에서 LIMIT 바인딩이 에러를 유발하므로 안전한 인라인 사용
        query += ` LIMIT ${effectiveLimit}`;
        console.log("API: Limiting results to:", effectiveLimit);

        const [courses] = await connection.execute(query, params);

        // MySQL 연결 즉시 반환 (formatted 결과만 반환 예정)
        connection.release();
        const coursesArray = courses as Array<{
            id: number;
            title: string;
            description: string;
            duration: string;
            location: string;
            price: string;
            imageUrl: string;
            concept: string;
            rating: number;
            current_participants: number;
            view_count: number;
        }>;

        console.log("API: Found courses:", coursesArray.length);

        // 데이터 포맷팅
        const formattedCourses = coursesArray.map((course) => ({
            id: course.id.toString(),
            title: course.title || "제목 없음",
            description: course.description || "",
            duration: course.duration || "",
            location: course.location || "",
            price: course.price || "",
            imageUrl: course.imageUrl || "",
            concept: course.concept || "",
            rating: Number(course.rating) || 0,
            reviewCount: 0, // 나중에 리뷰 테이블과 조인
            participants: course.current_participants || 0,
            viewCount: (course as any).view_count || 0,
        }));

        console.log("API: Returning formatted courses:", formattedCourses.length);

        return NextResponse.json(formattedCourses, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // 5분 캐시, 10분 stale-while-revalidate
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
        // GET에서는 위에서 release 처리함. 안전 차원 이중 release 방지
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

        // 인증 필요
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
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
            imageUrl: imageUrl || "",
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
