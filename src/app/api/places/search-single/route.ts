import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const raw = (searchParams.get("query") || "").trim();
        if (!raw) return NextResponse.json({ success: false, error: "query가 필요합니다." }, { status: 400 });

        // "식물원:1" 형태 방어 - 콜론 앞부분만 사용
        const query = raw.split(":")[0].trim();

        // 1) Places 테이블에서 이름/주소 부분 일치 검색
        const place = await prisma.place.findFirst({
            where: {
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { address: { contains: query, mode: "insensitive" } },
                ],
            },
            select: { id: true, name: true, address: true, imageUrl: true, latitude: true, longitude: true },
        });
        if (place?.latitude && place?.longitude) {
            return NextResponse.json({
                success: true,
                place: {
                    id: place.id,
                    name: place.name,
                    address: place.address,
                    imageUrl: place.imageUrl,
                    lat: place.latitude,
                    lng: place.longitude,
                },
            });
        }

        // 2) 코스 지역명으로 중심 좌표 유추: region/title 매칭 → 첫 장소 좌표 사용
        const course = await prisma.course.findFirst({
            where: {
                OR: [
                    { region: { contains: query, mode: "insensitive" } },
                    { title: { contains: query, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                title: true,
                coursePlaces: {
                    orderBy: { order_index: "asc" },
                    select: { place: { select: { id: true, name: true, latitude: true, longitude: true } } },
                },
            },
        });
        const start = course?.coursePlaces?.[0]?.place;
        if (start?.latitude && start?.longitude) {
            return NextResponse.json({
                success: true,
                place: {
                    id: start.id,
                    name: start.name,
                    address: "",
                    imageUrl: null,
                    lat: start.latitude,
                    lng: start.longitude,
                },
            });
        }

        // 3) 외부 Kakao 키워드 검색으로 좌표 획득
        const kakaoKey = process.env.KAKAO_REST_API_KEY as string | undefined;
        if (kakaoKey) {
            const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
            const res = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` }, cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                const first = Array.isArray((data as any)?.documents) ? (data as any).documents[0] : null;
                if (first) {
                    return NextResponse.json({
                        success: true,
                        place: {
                            id: first.id,
                            name: first.place_name,
                            address: first.road_address_name || first.address_name || "",
                            imageUrl: null,
                            lat: parseFloat(first.y),
                            lng: parseFloat(first.x),
                        },
                    });
                }
            }
        }

        return NextResponse.json({ success: false, error: "검색 결과가 없습니다." }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error?.message || "검색 실패" }, { status: 500 });
    }
}
