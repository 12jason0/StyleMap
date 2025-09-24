import { NextRequest, NextResponse } from "next/server";

// 사용 환경변수
// NAVER_SEARCH_CLIENT_ID, NAVER_SEARCH_CLIENT_SECRET: 네이버 검색(Local) v1 API
// NAVER_MAP_API_KEY_ID, NAVER_MAP_API_KEY: NCP 지도 Geocode v2 API (좌표 변환용)

export const dynamic = "force-dynamic";

async function naverLocalSearch(query: string) {
    const id = process.env.NAVER_SEARCH_CLIENT_ID as string | undefined;
    const secret = process.env.NAVER_SEARCH_CLIENT_SECRET as string | undefined;
    if (!id || !secret) throw new Error("서버 설정 오류: NAVER_SEARCH_CLIENT_ID/SECRET 누락");

    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(
        query
    )}&display=10&start=1&sort=random`;
    const res = await fetch(url, {
        headers: {
            "X-Naver-Client-Id": id,
            "X-Naver-Client-Secret": secret,
        },
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`네이버 로컬 검색 실패: ${res.status}`);
    return (await res.json()) as any;
}

async function naverGeocode(address: string) {
    const keyId = process.env.NAVER_MAP_API_KEY_ID as string | undefined;
    const key = process.env.NAVER_MAP_API_KEY as string | undefined;
    if (!keyId || !key) return null; // 좌표 없으면 스킵

    const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
        headers: {
            "X-NCP-APIGW-API-KEY-ID": keyId,
            "X-NCP-APIGW-API-KEY": key,
        },
        cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const first = Array.isArray(data?.addresses) ? data.addresses[0] : null;
    if (!first || !first.x || !first.y) return null;
    return { lng: parseFloat(first.x), lat: parseFloat(first.y) };
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");
        const keyword = (searchParams.get("keyword") || "").trim();

        const keywords = keyword ? [keyword] : ["맛집", "카페", "관광명소"];

        const results: any[] = [];
        for (const kw of keywords) {
            const local = await naverLocalSearch(kw);
            const items: any[] = Array.isArray(local?.items) ? local.items : [];
            for (const it of items) {
                const title = String(it?.title || "").replace(/<[^>]+>/g, "");
                const address = it?.roadAddress || it?.address || "";
                let coords: { lat: number; lng: number } | null = null;
                if (address) {
                    coords = await naverGeocode(address);
                }
                results.push({
                    id: `${it?.mapx || ""}_${it?.mapy || ""}_${title}`,
                    name: title,
                    address: address,
                    description: it?.category || undefined,
                    category: it?.category || undefined,
                    phone: it?.telephone || undefined,
                    website: it?.link || undefined,
                    imageUrl: "/images/placeholder-location.jpg",
                    latitude: coords ? coords.lat : undefined,
                    longitude: coords ? coords.lng : undefined,
                });
            }
        }

        // 중복 제거 (name + address 기준)
        const unique = Array.from(new Map(results.map((p) => [`${p.name}_${p.address}`, p])).values());

        return NextResponse.json({ success: true, places: unique });
    } catch (error) {
        console.error("NAVER 장소 검색 API 오류:", error);
        return NextResponse.json({ success: false, error: "네이버 장소 검색 중 오류" }, { status: 500 });
    }
}
