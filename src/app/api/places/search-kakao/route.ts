import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Kakao Local API: Keyword Search
// Docs: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
async function kakaoKeywordSearch(query: string, lat: number, lng: number, radius: number) {
    const restKey = process.env.KAKAO_REST_API_KEY as string | undefined;
    if (!restKey) throw new Error("서버 설정 오류: KAKAO_REST_API_KEY 누락");

    // Kakao radius meters: 0~20000, sort=distance requires x,y provided
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
        query
    )}&x=${lng}&y=${lat}&radius=${Math.min(Math.max(radius, 0), 20000)}&sort=distance`;

    const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${restKey}` },
        cache: "no-store",
    });
    if (!res.ok) {
        console.error("Kakao Keyword API 응답 실패:", await res.text());
        throw new Error(`Kakao 검색 실패: ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray((data as any)?.documents) ? (data as any).documents : [];
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const latStr = searchParams.get("lat");
        const lngStr = searchParams.get("lng");
        const radiusStr = searchParams.get("radius") || "2000"; // 기본 2km
        const keyword = (searchParams.get("keyword") || "").trim();

        const lat = latStr ? parseFloat(latStr) : NaN;
        const lng = lngStr ? parseFloat(lngStr) : NaN;
        const radius = parseInt(radiusStr, 10);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return NextResponse.json(
                { success: false, error: "필수 파라미터(lat, lng)가 누락되었거나 잘못되었습니다." },
                { status: 400 }
            );
        }

        const keywords = keyword ? [keyword] : ["맛집", "카페", "관광명소", "명소", "랜드마크"];
        let combinedResults: any[] = [];

        for (const kw of keywords) {
            const docs = await kakaoKeywordSearch(kw, lat, lng, radius);
            combinedResults.push(
                ...docs.map((d: any) => ({
                    id: d.id,
                    name: d.place_name,
                    address: d.road_address_name || d.address_name,
                    description: d.category_group_name || d.category_name,
                    category: d.category_group_name || d.category_name,
                    phone: d.phone,
                    website: d.place_url,
                    imageUrl: "",
                    latitude: parseFloat(d.y),
                    longitude: parseFloat(d.x),
                }))
            );
        }

        // 저수지 제외 + id 기준 중복 제거
        const filtered = combinedResults.filter((p) => {
            const name = String(p.name || "");
            const cat = String(p.category || "");
            return !name.includes("저수지") && !cat.includes("저수지");
        });
        const uniquePlaces = Array.from(new Map(filtered.map((p) => [p.id, p])).values());

        return NextResponse.json({ success: true, places: uniquePlaces });
    } catch (error) {
        console.error("카카오 장소 검색 API 오류:", error);
        return NextResponse.json({ success: false, error: "장소 검색 중 오류가 발생했습니다." }, { status: 500 });
    }
}
