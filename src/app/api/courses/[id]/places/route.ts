import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("Fetching places for course ID:", courseId);

        const connection = await pool.getConnection();
        console.log("Database connection established");

        try {
            console.log("Executing query for course places");
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
                    p.image_url
                FROM course_places cp
                JOIN places p ON cp.place_id = p.id
                WHERE cp.course_id = ?
                ORDER BY cp.order_index ASC`,
                [courseId]
            );
            console.log("Query executed successfully, found", (coursePlaces as any[]).length, "places");

            // 결과를 중첩된 객체 구조로 변환
            const formattedPlaces = (coursePlaces as any[]).map((cp) => ({
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
                    parking_available: cp.parking_available,
                    reservation_required: cp.reservation_required,
                    latitude: cp.latitude,
                    longitude: cp.longitude,
                    image_url: cp.image_url,
                },
            }));

            console.log("Formatted places:", formattedPlaces);
            return NextResponse.json(formattedPlaces);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching course places:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
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
