import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const keyword = searchParams.get("keyword");
    const radius = searchParams.get("radius") || "2000"; // 기본 반경 2km

    if (!lat || !lng || !keyword) {
        return NextResponse.json({ error: "위치 정보와 키워드는 필수입니다." }, { status: 400 });
    }

    // 카카오맵 API는 서버에서 호출해야 REST API 키를 안전하게 사용할 수 있습니다.
    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

    if (!KAKAO_REST_API_KEY) {
        return NextResponse.json({ error: "서버 설정 에러: 카카오 REST API 키가 없습니다." }, { status: 500 });
    }

    const kakaoApiUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?y=${lat}&x=${lng}&radius=${radius}&query=${encodeURIComponent(
        keyword
    )}`;

    try {
        const apiResponse = await fetch(kakaoApiUrl, {
            headers: {
                Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
            },
        });

        if (!apiResponse.ok) {
            throw new Error(`카카오 API 요청 실패: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();

        // 프론트엔드의 Place 인터페이스 형식에 맞게 데이터를 가공
        const places = data.documents.map((doc: any) => ({
            id: doc.id,
            name: doc.place_name,
            category: doc.category_name.split(" > ").pop(), // '음식점 > 한식 > 육류,고기' -> '육류,고기'
            distance: `${doc.distance}m`,
            address: doc.address_name,
            description: doc.road_address_name || doc.address_name,
            rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)), // 카카오 API는 평점을 제공하지 않으므로 임의 생성
            phone: doc.phone,
            website: doc.place_url,
            imageUrl: "/images/placeholder-location.jpg", // 카카오 API는 사진을 제공하지 않음
            latitude: parseFloat(doc.y),
            longitude: parseFloat(doc.x),
        }));

        return NextResponse.json({ success: true, places });
    } catch (error) {
        console.error("카카오 장소 검색 API 오류:", error);
        return NextResponse.json({ error: "장소 검색 중 오류 발생" }, { status: 500 });
    }
}
