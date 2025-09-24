import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("query") || "").trim();

    if (!query) {
        return NextResponse.json({ success: false, error: "검색어는 필수입니다." }, { status: 400 });
    }

    const id = process.env.NAVER_SEARCH_CLIENT_ID as string | undefined;
    const secret = process.env.NAVER_SEARCH_CLIENT_SECRET as string | undefined;
    if (!id || !secret) {
        return NextResponse.json(
            { success: false, error: "서버 설정 오류: NAVER_SEARCH_CLIENT_ID/SECRET 누락" },
            { status: 500 }
        );
    }

    try {
        const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(
            query
        )}&display=1&start=1&sort=comment`;
        const res = await fetch(url, {
            headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
            cache: "no-store",
        });
        if (!res.ok) throw new Error(`NAVER local 검색 실패: ${res.status}`);
        const data = await res.json();
        const first = Array.isArray((data as any)?.items) ? (data as any).items[0] : null;
        if (!first) return NextResponse.json({ success: false, error: "검색 결과가 없습니다." }, { status: 404 });

        const address = first?.roadAddress || first?.address || "";
        if (!address) return NextResponse.json({ success: false, error: "주소 정보가 없습니다." }, { status: 404 });

        const keyId = process.env.NAVER_MAP_API_KEY_ID as string | undefined;
        const key = process.env.NAVER_MAP_API_KEY as string | undefined;
        if (!keyId || !key)
            return NextResponse.json({ success: false, error: "지오코드 API 키 누락" }, { status: 500 });

        const geoUrl = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(
            address
        )}`;
        const geoRes = await fetch(geoUrl, {
            headers: { "X-NCP-APIGW-API-KEY-ID": keyId, "X-NCP-APIGW-API-KEY": key },
        });
        if (!geoRes.ok) {
            return NextResponse.json({
                success: true,
                place: {
                    id: `${first?.mapx || ""}_${first?.mapy || ""}_${first?.title || query}`,
                    name: String(first?.title || query).replace(/<[^>]+>/g, ""),
                    address,
                    lat: null,
                    lng: null,
                },
            });
        }
        const geoData = await geoRes.json();
        const g = Array.isArray((geoData as any)?.addresses) ? (geoData as any).addresses[0] : null;
        if (!g || !g.x || !g.y)
            return NextResponse.json({
                success: true,
                place: {
                    id: `${first?.mapx || ""}_${first?.mapy || ""}_${first?.title || query}`,
                    name: String(first?.title || query).replace(/<[^>]+>/g, ""),
                    address,
                    lat: null,
                    lng: null,
                },
            });

        const result = {
            id: `${first?.mapx || ""}_${first?.mapy || ""}_${first?.title || query}`,
            name: String(first?.title || query).replace(/<[^>]+>/g, ""),
            address,
            lat: parseFloat(g.y),
            lng: parseFloat(g.x),
        };
        return NextResponse.json({ success: true, place: result });
    } catch (error) {
        console.error("NAVER 검색/지오코드 오류:", error);
        return NextResponse.json({ success: false, error: "장소 검색 중 오류 발생" }, { status: 500 });
    }
}
