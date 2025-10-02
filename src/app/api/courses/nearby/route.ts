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
    const regionQuery = (searchParams.get("region") || "").trim();
    const radiusParam = searchParams.get("radius");
    const kmParam = searchParams.get("km");
    let radius = 2000;

    if (kmParam && !isNaN(parseFloat(kmParam))) {
        radius = Math.round(parseFloat(kmParam) * 1000);
    } else if (radiusParam && !isNaN(parseFloat(radiusParam))) {
        radius = Math.round(parseFloat(radiusParam));
    }
    radius = Math.min(10000, Math.max(100, radius));

    // 좌표가 있으면 검색 범위를 좁히기 위한 대략적 바운딩박스 계산 (성능 개선)
    const hasCoords = !isNaN(lat) && !isNaN(lng);
    const metersPerDegLat = 111_320; // 근사치
    const metersPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180 || 1);
    const dLat = hasCoords ? radius / metersPerDegLat : 0;
    const dLng = hasCoords ? radius / metersPerDegLng : 0;
    const minLat = hasCoords ? lat - dLat : undefined;
    const maxLat = hasCoords ? lat + dLat : undefined;
    const minLng = hasCoords ? lng - dLng : undefined;
    const maxLng = hasCoords ? lng + dLng : undefined;

    // 지역/키워드 검색 우선 처리 (좌표 동반 시 바운딩박스로 선필터)
    if (regionQuery) {
        try {
            const regionCourses = await prisma.course.findMany({
                take: 140,
                where: {
                    AND: [
                        {
                            OR: [
                                { region: { contains: regionQuery, mode: "insensitive" } },
                                { title: { contains: regionQuery, mode: "insensitive" } },
                                { description: { contains: regionQuery, mode: "insensitive" } },
                                { concept: { contains: regionQuery, mode: "insensitive" } },
                                {
                                    coursePlaces: {
                                        some: {
                                            place: {
                                                OR: [
                                                    { name: { contains: regionQuery, mode: "insensitive" } },
                                                    { address: { contains: regionQuery, mode: "insensitive" } },
                                                ],
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                        ...(hasCoords
                            ? [
                                  {
                                      coursePlaces: {
                                          some: {
                                              place: {
                                                  latitude: { gte: minLat as number, lte: maxLat as number },
                                                  longitude: { gte: minLng as number, lte: maxLng as number },
                                              },
                                          },
                                      },
                                  },
                              ]
                            : []),
                    ],
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    imageUrl: true,
                    region: true,
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

            const enriched = (regionCourses as any[]).map((c) => ({
                ...c,
                start_place_name: c.coursePlaces?.[0]?.place?.name || "",
                distance: 0,
            }));

            // 장소 사진이 최소 1장이라도 있는 코스 우선 노출 (course.imageUrl 유무와 무관)
            const withPlaceImages = (enriched as CourseWithDistance[]).filter(
                (c) => Array.isArray(c.coursePlaces) && c.coursePlaces.some((cp: any) => !!cp?.place?.imageUrl)
            );
            // 장소 사진이 없는 코스만 있을 때도 결과를 보여주기 위해 폴백 제공
            const baselineSorted = (enriched as CourseWithDistance[]).slice(0, 140);

            // 좌표 동반 시 거리 계산하여 반경 내 우선 정렬
            let finalList = baselineSorted;
            if (hasCoords) {
                const toRad = (deg: number) => (deg * Math.PI) / 180;
                const R = 6371000;
                finalList = baselineSorted
                    .map((c) => {
                        const sp = (c as any).coursePlaces?.[0]?.place;
                        if (!sp?.latitude || !sp?.longitude) return c;
                        const lat1 = toRad(Number(sp.latitude));
                        const lon1 = toRad(Number(sp.longitude));
                        const lat2 = toRad(lat);
                        const lon2 = toRad(lng);
                        const dLat2 = lat2 - lat1;
                        const dLon2 = lon2 - lon1;
                        const a2 =
                            Math.sin(dLat2 / 2) * Math.sin(dLat2 / 2) +
                            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon2 / 2) * Math.sin(dLon2 / 2);
                        const cH2 = 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
                        const dist = R * cH2;
                        return { ...(c as any), distance: dist } as CourseWithDistance;
                    })
                    .filter((c) => c.distance <= radius)
                    .sort((a, b) => a.distance - b.distance);
            }

            const primary = withPlaceImages.length > 0 ? withPlaceImages : finalList;
            return NextResponse.json({ success: true, courses: primary.slice(0, 20) });
        } catch (error) {
            console.error("지역 코스 검색 오류:", error);
            return NextResponse.json({ success: false, error: "지역 코스 검색 중 오류 발생" }, { status: 500 });
        }
    }

    if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ success: false, error: "위치 정보가 필요합니다." }, { status: 400 });
    }

    try {
        // 성능 최적화: 필요한 필드만 select
        const courses = await prisma.course.findMany({
            take: 140,
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
            where: hasCoords
                ? {
                      coursePlaces: {
                          some: {
                              place: {
                                  latitude: { gte: minLat as number, lte: maxLat as number },
                                  longitude: { gte: minLng as number, lte: maxLng as number },
                              },
                          },
                      },
                  }
                : undefined,
        });

        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371000; // 미터 단위

        // 각 코스의 모든 장소 중 "가장 가까운" 장소를 기준으로 거리 계산
        const enriched: CourseWithDistance[] = (courses as any[])
            .map((c): CourseWithDistance | null => {
                const places: any[] = Array.isArray(c.coursePlaces)
                    ? c.coursePlaces.map((cp: any) => cp.place).filter((p: any) => p?.latitude && p?.longitude)
                    : [];
                if (places.length === 0) return null;

                let minDist = Number.POSITIVE_INFINITY;
                for (const p of places) {
                    const plat = toRad(Number(p.latitude));
                    const plng = toRad(Number(p.longitude));
                    const tlat = toRad(lat);
                    const tlng = toRad(lng);
                    const dLat = tlat - plat;
                    const dLon = tlng - plng;
                    const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(plat) * Math.cos(tlat) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const cH = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const dist = R * cH;
                    if (dist < minDist) minDist = dist;
                }

                const startPlace = c.coursePlaces?.[0]?.place;
                return {
                    ...c,
                    start_place_name: startPlace?.name,
                    distance: minDist,
                } as CourseWithDistance;
            })
            .filter((c): c is CourseWithDistance => c !== null);

        // ############ 👇 핵심: "코스 내 어떤 장소라도" 반경 내면 채택 ############
        const withinRadius = enriched.filter((c) => c.distance <= radius);

        // 장소 사진이 최소 1장이라도 있는 코스 우선 노출 (course.imageUrl 유무와 무관)
        const withPlaceImages = (withinRadius as CourseWithDistance[]).filter(
            (c) => Array.isArray(c.coursePlaces) && c.coursePlaces.some((cp: any) => !!cp?.place?.imageUrl)
        );
        const baselineSorted = withinRadius.sort((a, b) => a.distance - b.distance);
        const filtered = (withPlaceImages.length > 0 ? withPlaceImages : baselineSorted)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 20);

        return NextResponse.json({ success: true, courses: filtered });
    } catch (error) {
        console.error("주변 코스 검색 API 오류:", error);
        return NextResponse.json({ success: false, error: "주변 코스 검색 중 오류 발생" }, { status: 500 });
    }
}
