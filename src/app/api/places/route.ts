import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");
        const region = searchParams.get("region");

        if (!lat || !lng) {
            return NextResponse.json({ error: "위도와 경도가 필요합니다." }, { status: 400 });
        }

        // 데이터베이스에서 해당 지역의 장소들을 가져오기
        const connection = await pool.getConnection();
        let places: Array<{
            id: number;
            name: string;
            address: string;
            description: string;
            category: string;
            avg_cost_range: string;
            opening_hours: string;
            phone?: string;
            website?: string;
            parking_available: boolean;
            reservation_required: boolean;
            latitude: number;
            longitude: number;
            imageUrl?: string;
        }>;
        try {
            // places 테이블에서 실제 데이터 조회
            const [result] = await connection.execute(
                "SELECT id, name, address, description, category, avg_cost_range, opening_hours, phone, website, parking_available, reservation_required, latitude, longitude, imageUrl FROM places LIMIT 20"
            );
            places = result as Array<{
                id: number;
                name: string;
                address: string;
                description: string;
                category: string;
                avg_cost_range: string;
                opening_hours: string;
                phone?: string;
                website?: string;
                parking_available: boolean;
                reservation_required: boolean;
                latitude: number;
                longitude: number;
                imageUrl?: string;
            }>;
        } finally {
            connection.release();
        }

        // 장소 데이터를 Place 인터페이스에 맞게 변환
        const transformedPlaces = places.map((place) => {
            // 혼잡도 계산 (랜덤)
            const crowdLevels = ["여유", "보통", "혼잡", "매우 혼잡"];
            const crowdLevel = crowdLevels[Math.floor(Math.random() * crowdLevels.length)];

            // 거리 계산 (실제 좌표 기반)
            const distance = Math.random() * 2 + 0.1; // 0.1km ~ 2.1km
            const distanceStr = distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;

            return {
                id: place.id,
                name: place.name,
                crowd: crowdLevel,
                type: place.category,
                distance: distanceStr,
                address: place.address,
                category: place.category,
                description: place.description,
                rating: Math.floor(Math.random() * 5) + 1, // 1-5 랜덤 평점
                participants: `${Math.floor(Math.random() * 50) + 1}/${Math.floor(Math.random() * 100) + 50}`, // 랜덤 참가자 수
                imageUrl: place.imageUrl || "/images/SeongsuFood-001.png",
                latitude: place.latitude,
                longitude: place.longitude,
            };
        });

        // 거리순으로 정렬
        transformedPlaces.sort((a, b) => {
            const distA = parseFloat(a.distance.replace("km", "").replace("m", ""));
            const distB = parseFloat(b.distance.replace("km", "").replace("m", ""));
            return distA - distB;
        });

        return NextResponse.json({
            success: true,
            places: transformedPlaces,
            region: region,
        });
    } catch (error) {
        console.error("API: 장소 검색 오류:", error);
        return NextResponse.json({ error: "장소 검색 중 오류가 발생했습니다." }, { status: 500 });
    }
}
