import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const coords = searchParams.get("coords");
        const mode = searchParams.get("mode") || "driving";

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

        const endpoint =
            mode === "walking"
                ? "https://naveropenapi.apigw.ntruss.com/map-direction/v1/walking"
                : "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving";

        const url = `${endpoint}?start=${start}&goal=${goal}&option=traoptimal`;

        const response = await fetch(url, {
            headers: {
                "X-NCP-APIGW-API-KEY-ID": clientId,
                "X-NCP-APIGW-API-KEY": clientSecret,
            },
            cache: "no-store",
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Directions API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
