import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
    let connection;

    try {
        console.log("API: Starting to fetch concept counts...");

        // 데이터베이스 연결 시도
        connection = await pool.getConnection();
        console.log("API: Database connection successful");

        // 각 concept별 코스 개수 조회
        const [result] = await connection.execute(`
            SELECT concept, COUNT(*) as count 
            FROM courses 
            WHERE concept IS NOT NULL AND concept != ''
            GROUP BY concept 
            ORDER BY concept
        `);

        const conceptCounts = result as Array<{ concept: string; count: number }>;

        // 결과를 객체로 변환
        const counts: Record<string, number> = {};
        conceptCounts.forEach((item) => {
            counts[item.concept] = Number(item.count);
        });

        return NextResponse.json(counts, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // 5분 캐시, 10분 stale-while-revalidate
            },
        });
    } catch (error) {
        console.error("API: Error fetching concept counts:", error);

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
                { error: "테이블이 존재하지 않음", details: "courses 테이블을 생성해주세요" },
                { status: 500 }
            );
        } else {
            return NextResponse.json(
                { error: "concept 개수를 가져오는 중 오류 발생", details: errorMessage },
                { status: 500 }
            );
        }
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
