import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function toRad(v: number) {
    return (v * Math.PI) / 180;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function naverLocalSearch(query: string) {
    const id = process.env.NAVER_SEARCH_CLIENT_ID as string | undefined;
    const secret = process.env.NAVER_SEARCH_CLIENT_SECRET as string | undefined;
    if (!id || !secret) throw new Error("서버 설정 오류: NAVER_SEARCH_CLIENT_ID/SECRET 누락");
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(
        query
    )}&display=20&start=1&sort=comment`;
    const res = await fetch(url, {
        headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`네이버 로컬 검색 실패: ${res.status}`);
    return (await res.json()) as any;
}

async function naverGeocode(address: string) {
    const keyId = process.env.NAVER_MAP_API_KEY_ID as string | undefined;
    const key = process.env.NAVER_MAP_API_KEY as string | undefined;
    if (!keyId || !key) return null;
    const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
        headers: { "X-NCP-APIGW-API-KEY-ID": keyId, "X-NCP-APIGW-API-KEY": key },
        cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray((data as any)?.addresses) ? (data as any).addresses[0] : null;
    if (!first || !first.x || !first.y) return null;
    return { lng: parseFloat(first.x), lat: parseFloat(first.y) };
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const keyword = (searchParams.get("keyword") || "").trim();
    const radiusStr = searchParams.get("radius") || "2000";

    if (!latStr || !lngStr || !keyword) {
        return NextResponse.json({ error: "위치 정보와 키워드는 필수입니다." }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const radius = parseFloat(radiusStr);

    try {
        const local = await naverLocalSearch(keyword);
        const items: any[] = Array.isArray(local?.items) ? local.items : [];
        const enriched: any[] = [];
        for (const it of items) {
            const title = String(it?.title || "").replace(/<[^>]+>/g, "");
            const address = it?.roadAddress || it?.address || "";
            if (!address) continue;
            const coords = await naverGeocode(address);
            if (!coords) continue;
            const dist = haversine(lat, lng, coords.lat, coords.lng);
            if (Number.isFinite(radius) && dist > radius) continue;
            enriched.push({
                id: `${it?.mapx || ""}_${it?.mapy || ""}_${title}`,
                name: title,
                category: it?.category || "",
                distance: `${Math.round(dist)}m`,
                address,
                description: it?.category || undefined,
                phone: it?.telephone || undefined,
                website: it?.link || undefined,
                imageUrl: "/images/placeholder-location.jpg",
                latitude: coords.lat,
                longitude: coords.lng,
            });
        }

        // 가까운 순 정렬
        enriched.sort((a, b) => (parseInt(a.distance) || 0) - (parseInt(b.distance) || 0));
        return NextResponse.json({ success: true, places: enriched });
    } catch (error) {
        console.error("NAVER 장소 검색 API 오류:", error);
        return NextResponse.json({ error: "장소 검색 중 오류 발생" }, { status: 500 });
    }
}
