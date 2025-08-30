import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("API: Fetching places for course ID:", courseId);

        const connection = await pool.getConnection();

        try {
            // 1단계: 데이터베이스 연결 확인
            console.log("API: Database connection successful");

            // 2단계: course_places 테이블 확인
            console.log("API: Checking course_places table for course ID:", courseId);
            const [coursePlacesCheck] = await connection.execute("SELECT * FROM course_places WHERE course_id = ?", [
                courseId,
            ]);
            console.log("API: course_places check result:", coursePlacesCheck);

            // 3단계: places 테이블 확인
            console.log("API: Checking places table");
            const [placesCheck] = await connection.execute("SELECT * FROM places LIMIT 3");
            console.log("API: places check result:", placesCheck);

            // 4단계: 조인 쿼리 실행
            console.log("API: Executing join query for course ID:", courseId);
            const [coursePlaces] = await connection.execute(
                `SELECT 
                    cp.id,
                    cp.course_id,
                    cp.place_id,
                    cp.order_index,
                    cp.estimated_duration,
                    cp.recommended_time,
                    cp.notes,
                    p.name,
                    p.address,
                    p.description,
                    p.category,
                    p.avg_cost_range,
                    p.opening_hours,
                    p.phone,
                    p.website,
                    p.parking_available,
                    p.reservation_required,
                    p.latitude,
                    p.longitude,
                    p.imageUrl
                FROM course_places cp
                JOIN places p ON cp.place_id = p.id
                WHERE cp.course_id = ?
                ORDER BY cp.order_index`,
                [courseId]
            );

            const coursePlacesArray = coursePlaces as Array<{
                id: number;
                course_id: number;
                place_id: number;
                order_index: number;
                estimated_duration: string;
                recommended_time: string;
                notes: string;
                name: string;
                address: string;
                description: string;
                category: string;
                avg_cost_range: string;
                opening_hours: string;
                phone: string;
                website: string;
                parking_available: boolean;
                reservation_required: boolean;
                latitude: number;
                longitude: number;
                imageUrl: string;
            }>;
            console.log("API: Found course places:", coursePlacesArray.length);
            console.log("API: Course places raw data:", coursePlacesArray);

            // 5단계: 데이터 포맷팅
            const formattedCoursePlaces = coursePlacesArray.map((cp) => ({
                id: cp.id,
                course_id: cp.course_id,
                place_id: cp.place_id,
                order_index: cp.order_index,
                estimated_duration: cp.estimated_duration,
                recommended_time: cp.recommended_time,
                notes: cp.notes,
                place: {
                    id: cp.place_id,
                    name: cp.name,
                    address: cp.address,
                    description: cp.description,
                    category: cp.category,
                    avg_cost_range: cp.avg_cost_range,
                    opening_hours: cp.opening_hours,
                    phone: cp.phone,
                    website: cp.website,
                    parking_available: Boolean(cp.parking_available),
                    reservation_required: Boolean(cp.reservation_required),
                    latitude: Number(cp.latitude),
                    longitude: Number(cp.longitude),
                    image_url: cp.imageUrl,
                },
            }));

            console.log("API: Formatted course places:", formattedCoursePlaces);
            return NextResponse.json(formattedCoursePlaces);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching course places:", error);
        console.error("API: Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : "No stack trace",
        });
        return NextResponse.json(
            {
                error: "Failed to fetch course places",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
