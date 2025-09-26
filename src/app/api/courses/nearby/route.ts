// src/app/api/courses/nearby/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { filterCoursesByImagePolicy, CourseWithPlaces } from "@/lib/imagePolicy";

export const dynamic = "force-dynamic";

// CourseWithPlaces에 distance와 start_place_name 속성을 추가한 확장 타입
type CourseWithDistance = Partial<CourseWithPlaces> & {
    distance: number;
    start_place_name?: string;
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const radiusParam = searchParams.get("radius");
    const kmParam = searchParams.get("km");
    let radius = 2000;

    if (kmParam && !isNaN(parseFloat(kmParam))) {
        radius = Math.round(parseFloat(kmParam) * 1000);
    } else if (radiusParam && !isNaN(parseFloat(radiusParam))) {
        radius = Math.round(parseFloat(radiusParam));
    }
    radius = Math.min(10000, Math.max(100, radius));

    if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ success: false, error: "위치 정보가 필요합니다." }, { status: 400 });
    }

    try {
        // 성능 최적화: 필요한 필드만 select
        const courses = await prisma.course.findMany({
            take: 200,
            select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                coursePlaces: {
                    orderBy: { order_index: "asc" },
                    select: {
                        order_index: true,
                        place: {
                            select: { id: true, name: true, imageUrl: true, latitude: true, longitude: true },
                        },
                    },
                },
            },
        });

        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371000; // 미터 단위

        const enriched: CourseWithDistance[] = (courses as any[])
            .map((c): CourseWithDistance | null => {
                const startPlace = c.coursePlaces?.[0]?.place;
                if (!startPlace?.latitude || !startPlace?.longitude) {
                    return null;
                }

                const lat1 = toRad(Number(startPlace.latitude));
                const lon1 = toRad(Number(startPlace.longitude));
                const lat2 = toRad(lat);
                const lon2 = toRad(lng);

                const dLat = lat2 - lat1;
                const dLon = lon2 - lon1;

                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const cH = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distanceMeters = R * cH;

                return {
                    ...c,
                    start_place_name: startPlace?.name,
                    distance: distanceMeters,
                } as CourseWithDistance;
            })
            .filter((c): c is CourseWithDistance => c !== null);

        // ############ 👇 여기가 핵심 수정 부분입니다! ############
        // 1. `enriched`에서 반경 필터링을 먼저 수행합니다.
        const withinRadius = enriched.filter((c) => c.distance <= radius);

        // 2. 이미지 정책 필터를 적용합니다.
        // 이미지 정책: 코스 자체 imageUrl이 있고, 장소 사진이 모두 있거나 최소 1장 있는 코스만 허용
        const imagePolicyApplied = filterCoursesByImagePolicy(withinRadius, "all-or-one-missing");

        // 3. 정렬 및 슬라이싱 전에 타입을 다시 `CourseWithDistance[]`로 단언해줍니다.
        const filtered = (imagePolicyApplied as CourseWithDistance[])
            .filter((c) => !!c.imageUrl)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 20);

        return NextResponse.json({ success: true, courses: filtered });
    } catch (error) {
        console.error("주변 코스 검색 API 오류:", error);
        return NextResponse.json({ success: false, error: "주변 코스 검색 중 오류 발생" }, { status: 500 });
    }
}
