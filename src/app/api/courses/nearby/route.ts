import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    // radius(m) 또는 km 파라미터 허용. 기본 2km
    const radiusParam = searchParams.get("radius");
    const kmParam = searchParams.get("km");
    let radius = 2000;
    if (kmParam && !isNaN(parseFloat(kmParam))) {
        radius = Math.round(parseFloat(kmParam) * 1000);
    } else if (radiusParam && !isNaN(parseFloat(radiusParam))) {
        radius = Math.round(parseFloat(radiusParam));
    }
    // 안전 범위 100m ~ 10km
    radius = Math.min(10000, Math.max(100, radius));

    if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ success: false, error: "위치 정보가 필요합니다." }, { status: 400 });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // 코스의 시작 장소(order_index=1)를 기준으로 거리를 계산하면서,
        // 코스에 이미지가 2개 이상 있는 경우만 반환
        const query = `
            SELECT 
                c.*, 
                p.name AS start_place_name,
                ST_Distance_Sphere(POINT(p.longitude, p.latitude), POINT(?, ?)) AS distance,
                COALESCE(img.images_count, 0) AS images_count
            FROM 
                courses c
            JOIN 
                course_places cp ON c.id = cp.course_id AND cp.order_index = 1
            JOIN 
                places p ON cp.place_id = p.id
            LEFT JOIN (
                SELECT cp2.course_id, COUNT(p2.imageUrl) AS images_count
                FROM course_places cp2
                JOIN places p2 ON cp2.place_id = p2.id
                WHERE p2.imageUrl IS NOT NULL AND p2.imageUrl <> ''
                GROUP BY cp2.course_id
            ) img ON img.course_id = c.id
            HAVING 
                distance <= ? AND images_count >= 2
            ORDER BY 
                distance
            LIMIT 5;
        `;

        const [rows] = await connection.execute(query, [lng, lat, radius]);
        return NextResponse.json({ success: true, courses: rows });
    } catch (error) {
        console.error("주변 코스 검색 API 오류:", error);
        return NextResponse.json({ success: false, error: "주변 코스 검색 중 오류 발생" }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
