import { NextRequest, NextResponse } from "next/server";

// 사용 환경변수
// NAVER_MAP_API_KEY_ID, NAVER_MAP_API_KEY: NCP 지도 API 키 (Places, Geocode 등)

export const dynamic = "force-dynamic";

// 좌표 기반으로 장소를 검색하는 NCP Places API 호출 함수
async function ncpPlaceSearch(query: string, lat: number, lng: number, radius: number) {
    const keyId = process.env.NAVER_MAP_API_KEY_ID as string | undefined;
    const key = process.env.NAVER_MAP_API_KEY as string | undefined;
    if (!keyId || !key) throw new Error("서버 설정 오류: NAVER_MAP_API_KEY_ID/KEY 누락");

    // Places API는 좌표(coordinate)와 반경(radius)을 필수 파라미터로 사용합니다.
    const url = `https://naveropenapi.apigw.ntruss.com/map-place/v1/search?query=${encodeURIComponent(
        query
    )}&coordinate=${lng},${lat}&radius=${radius}&sort=distance`;

    const res = await fetch(url, {
        headers: {
            "X-NCP-APIGW-API-KEY-ID": keyId,
            "X-NCP-APIGW-API-KEY": key,
        },
        cache: "no-store",
    });

    if (!res.ok) {
        console.error("NCP Places API 응답 실패:", await res.text());
        throw new Error(`NCP Places API 검색 실패: ${res.status}`);
    }

    const data = await res.json();
    // API 응답에서 'places' 배열을 반환, 없으면 빈 배열 반환
    return data.places || [];
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const latStr = searchParams.get("lat");
        const lngStr = searchParams.get("lng");
        const radiusStr = searchParams.get("radius") || "2000"; // 기본 반경 2km
        const keyword = (searchParams.get("keyword") || "").trim();

        const lat = latStr ? parseFloat(latStr) : NaN;
        const lng = lngStr ? parseFloat(lngStr) : NaN;
        const radius = parseInt(radiusStr, 10);

        // 위도, 경도 값이 없으면 검색을 수행할 수 없으므로 에러 처리
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return NextResponse.json(
                { success: false, error: "필수 파라미터(lat, lng)가 누락되었거나 잘못되었습니다." },
                { status: 400 }
            );
        }

        const keywords = keyword ? [keyword] : ["맛집", "카페", "관광명소"];
        let combinedResults: any[] = [];

        // 각 키워드에 대해 Places API를 호출하고 결과를 모두 합칩니다.
        for (const kw of keywords) {
            const places = await ncpPlaceSearch(kw, lat, lng, radius);
            combinedResults.push(...places);
        }

        // API에서 받은 결과의 중복을 제거(id 기준)하고 프론트엔드에서 사용할 형식으로 매핑합니다.
        const uniquePlaces = Array.from(new Map(combinedResults.map((p) => [p.id, p])).values()).map((p) => ({
            id: p.id,
            name: p.name,
            address: p.road_address || p.address,
            description: p.category?.join(", "), // 카테고리는 배열 형태일 수 있음
            category: p.category?.join(", "),
            phone: p.phone,
            website: p.site,
            imageUrl: p.thumUrl || "", // 빈 값이면 프론트에서 회색 placeholder
            latitude: parseFloat(p.y), // 위도
            longitude: parseFloat(p.x), // 경도
        }));

        // NCP Places API에서 이미 거리순(sort=distance)으로 정렬했으므로 추가 정렬은 필요 없습니다.

        return NextResponse.json({ success: true, places: uniquePlaces });
    } catch (error) {
        console.error("장소 검색 API 오류:", error);
        return NextResponse.json({ success: false, error: "장소 검색 중 오류가 발생했습니다." }, { status: 500 });
    }
}
