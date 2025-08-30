import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
        return NextResponse.json({ success: false, error: "검색어는 필수입니다." }, { status: 400 });
    }

    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

    if (!KAKAO_REST_API_KEY) {
        return NextResponse.json(
            { success: false, error: "서버 설정 에러: 카카오 REST API 키가 없습니다." },
            { status: 500 }
        );
    }

    const kakaoApiUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;

    try {
        const apiResponse = await fetch(kakaoApiUrl, {
            headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
        });

        if (!apiResponse.ok) {
            throw new Error(`카카오 API 요청 실패: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();

        if (data.documents && data.documents.length > 0) {
            const place = data.documents[0];
            const result = {
                id: place.id,
                name: place.place_name,
                address: place.address_name,
                lat: parseFloat(place.y),
                lng: parseFloat(place.x),
            };
            return NextResponse.json({ success: true, place: result });
        } else {
            return NextResponse.json({ success: false, error: "검색 결과가 없습니다." }, { status: 404 });
        }
    } catch (error) {
        console.error("장소 검색 API 오류:", error);
        return NextResponse.json({ success: false, error: "장소 검색 중 오류 발생" }, { status: 500 });
    }
}
