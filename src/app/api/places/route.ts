import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
        const places = await prisma.courses.findMany({
            where: {
                region: {
                    contains: region || "",
                },
            },
            select: {
                id: true,
                title: true,
                description: true,
                region: true,
                concept: true,
                rating: true,
                current_participants: true,
                max_participants: true,
                imageUrl: true,
            },
            take: 10,
        });

        // 장소 데이터를 Place 인터페이스에 맞게 변환
        const transformedPlaces = places.map((place, index) => {
            // 혼잡도 계산 (참가자 수 기반)
            const participationRate = place.current_participants / place.max_participants;
            let crowdLevel = "여유";
            if (participationRate >= 0.8) crowdLevel = "매우 혼잡";
            else if (participationRate >= 0.6) crowdLevel = "혼잡";
            else if (participationRate >= 0.4) crowdLevel = "보통";

            // 거리 계산 (간단한 랜덤 거리)
            const distance = Math.random() * 2 + 0.1; // 0.1km ~ 2.1km
            const distanceStr = distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;

            return {
                id: place.id,
                name: place.title,
                crowd: crowdLevel,
                type: place.concept,
                distance: distanceStr,
                address: `${place.region} ${Math.floor(Math.random() * 100) + 1}번지`,
                category: place.concept,
                description: place.description,
                rating: place.rating,
                participants: `${place.current_participants}/${place.max_participants}`,
                imageUrl: place.imageUrl,
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

