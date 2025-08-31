import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
    let connection;

    try {
        console.log("API: Starting to fetch concept counts...");

        // 데이터베이스 연결 시도
        connection = await pool.getConnection();
        console.log("API: Database connection successful");

        // 각 컨셉별 코스 개수 조회
        const [results] = await connection.execute("SELECT concept, COUNT(*) as count FROM courses GROUP BY concept");

        const conceptCounts = (results as Array<{ concept: string; count: number }>).reduce((acc, item) => {
            acc[item.concept] = item.count;
            return acc;
        }, {} as Record<string, number>);

        console.log("API: Concept counts:", conceptCounts);

        return NextResponse.json(conceptCounts, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("API: Error fetching concept counts:", errorMessage);

        return NextResponse.json(
            { error: "컨셉별 코스 개수를 가져오는 중 오류 발생", details: errorMessage },
            { status: 500 }
        );
    } finally {
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

