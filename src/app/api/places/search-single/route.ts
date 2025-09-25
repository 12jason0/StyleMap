import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("query") || "").trim();

    if (!query) {
        return NextResponse.json({ success: false, error: "검색어는 필수입니다." }, { status: 400 });
    }

    const kakaoKey = process.env.KAKAO_REST_API_KEY as string | undefined;
    if (!kakaoKey) {
        return NextResponse.json({ success: false, error: "서버 설정 오류: KAKAO_REST_API_KEY 누락" }, { status: 500 });
    }

    try {
        // Kakao Keyword search - get first result to center the map
        const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
        const res = await fetch(url, {
            headers: { Authorization: `KakaoAK ${kakaoKey}` },
            cache: "no-store",
        });
        if (!res.ok) throw new Error(`Kakao keyword 검색 실패: ${res.status}`);
        const data = await res.json();
        const first = Array.isArray((data as any)?.documents) ? (data as any).documents[0] : null;
        if (!first) return NextResponse.json({ success: false, error: "검색 결과가 없습니다." }, { status: 404 });

        const result = {
            id: first.id,
            name: first.place_name,
            address: first.road_address_name || first.address_name || "",
            lat: first ? parseFloat(first.y) : null,
            lng: first ? parseFloat(first.x) : null,
        };
        return NextResponse.json({ success: true, place: result });
    } catch (error) {
        console.error("Kakao 검색 오류:", error);
        return NextResponse.json({ success: false, error: "장소 검색 중 오류 발생" }, { status: 500 });
    }
}
