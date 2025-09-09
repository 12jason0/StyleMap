import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

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

    try {
        // Prisma로 가장 가까운 코스 5개 조회 (시작 장소 기준)
        // Postgres에선 ST_DistanceSphere가 없으므로 간단한 근사값(위경도 차이)으로 정렬
        const courses = await prisma.courses.findMany({
            take: 20, // 1차 후보 20개 가져와 필터링
            include: {
                // 시작 장소를 찾기 위해 코스-장소를 포함
                course_places: {
                    where: { order_index: 1 },
                    include: { places: true },
                },
            } as any,
        } as any);

        const enriched = (courses as any[])
            .map((c) => {
                const start = c.course_places?.[0]?.places;
                if (!start?.latitude || !start?.longitude) return null;
                const dLat = Number(start.latitude) - lat;
                const dLng = Number(start.longitude) - lng;
                const distanceApprox = Math.sqrt(dLat * dLat + dLng * dLng);
                // 이미지 보유 장소 개수 집계
                const imagesCount = (c.course_places || []).filter((cp: any) => !!cp.places?.imageUrl).length;
                return {
                    ...c,
                    start_place_name: start?.name,
                    distanceApprox,
                    images_count: imagesCount,
                };
            })
            .filter(Boolean) as any[];

        // 반경 필터 (근사값 → 대략 0.1 ~ 수 km 수준, 널널하게 0.2 이내)
        const filtered = enriched
            .filter((c) => c.images_count >= 2)
            .sort((a, b) => a.distanceApprox - b.distanceApprox)
            .slice(0, 5);

        return NextResponse.json({ success: true, courses: filtered });
    } catch (error) {
        console.error("주변 코스 검색 API 오류:", error);
        return NextResponse.json({ success: false, error: "주변 코스 검색 중 오류 발생" }, { status: 500 });
    }
}
