import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { filterCoursesByImagePolicy } from "@/lib/imagePolicy";
export const dynamic = "force-dynamic";

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
            take: 50, // 후보를 넉넉히 가져와 필터링
            include: {
                // 시작 장소를 찾기 위해 코스-장소와 장소 좌표 포함
                course_places: {
                    include: { places: true },
                },
            } as any,
        } as any);

        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371000; // meters

        const enriched = (courses as any[])
            .map((c) => {
                const start = (c.course_places || [])
                    .map((cp: any) => cp.places)
                    .find((p: any) => p?.latitude && p?.longitude);
                if (!start?.latitude || !start?.longitude) return null;
                const lat1 = toRad(Number(start.latitude));
                const lon1 = toRad(Number(start.longitude));
                const lat2 = toRad(lat);
                const lon2 = toRad(lng);
                const dLat = lat2 - lat1;
                const dLon = lon2 - lon1;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const cH = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distanceMeters = R * cH;
                const imagesCount = (c.course_places || []).filter((cp: any) => !!cp.places?.imageUrl).length;
                return {
                    ...c,
                    start_place_name: start?.name,
                    distance: distanceMeters,
                    images_count: imagesCount,
                };
            })
            .filter(Boolean) as any[];

        // 반경(m) 내 결과만 + 이미지 정책(모두 있거나 1개만 없는 경우 허용)
        const filtered = filterCoursesByImagePolicy(
            enriched.filter((c) => c.distance <= radius),
            "all-or-one-missing"
        )
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 10);

        return NextResponse.json({ success: true, courses: filtered });
    } catch (error) {
        console.error("주변 코스 검색 API 오류:", error);
        return NextResponse.json({ success: false, error: "주변 코스 검색 중 오류 발생" }, { status: 500 });
    }
}
