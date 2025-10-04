import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const coords = searchParams.get("coords"); // "lng,lat;lng,lat"
        const mode = (searchParams.get("mode") || "driving").toLowerCase();

        if (!coords) {
            return NextResponse.json({ error: "coords are required" }, { status: 400 });
        }

        const clientId = process.env.NAVER_MAP_API_KEY_ID;
        const clientSecret = process.env.NAVER_MAP_API_KEY;
        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: "Missing NAVER API credentials" }, { status: 500 });
        }

        const [start, goal] = coords.split(";");
        if (!start || !goal) {
            return NextResponse.json({ error: "coords must include start and goal" }, { status: 400 });
        }

        // --- API 선택 (운전은 큰길 경로 우선: trafast) ---
        const endpoint =
            mode === "walking"
                ? `https://naveropenapi.apigw.ntruss.com/map-direction/v1/walking?start=${start}&goal=${goal}`
                : `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${start}&goal=${goal}&option=trafast`; // 큰길/빠른길

        const response = await fetch(endpoint, {
            headers: {
                "X-NCP-APIGW-API-KEY-ID": clientId,
                "X-NCP-APIGW-API-KEY": clientSecret,
            },
            cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            // Naver API가 404/4xx를 반환할 때, 프론트 콘솔 에러(빨간 404)를 피하기 위해 200 + 빈 경로로 응답
            return NextResponse.json({ coordinates: [], error: data?.message || "NAVER_ERROR" });
        }

        // --- 경로만 추출해서 반환 (여러 케이스 견고 처리) ---
        let path: Array<[number, number]> | undefined = undefined;
        const route: any = (data as any)?.route || {};
        const preferKeys =
            mode === "driving" ? ["trafast", "traoptimal", "tracomfort"] : ["traoptimal", "trafast", "tracomfort"];
        for (const k of preferKeys) {
            const p = route?.[k]?.[0]?.path;
            if (Array.isArray(p)) {
                path = p;
                break;
            }
        }
        if (!path) {
            // route 내부의 첫 번째 path를 가진 키를 탐색
            try {
                for (const k of Object.keys(route)) {
                    const p = route?.[k]?.[0]?.path;
                    if (Array.isArray(p)) {
                        path = p;
                        break;
                    }
                }
            } catch {}
        }
        if (!path && Array.isArray(route?.path)) {
            path = route.path;
        }

        if (!Array.isArray(path)) {
            return NextResponse.json({ coordinates: [], error: "NO_PATH" });
        }

        return NextResponse.json({ coordinates: path });
    } catch (error: any) {
        console.error("Directions API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
