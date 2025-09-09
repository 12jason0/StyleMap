import { NextRequest, NextResponse } from "next/server";

// Kakao Mobility Directions API proxy
// Query:
//   coords: "lng,lat;lng,lat;..." (at least origin and destination)
//   mode: "car" | "foot" (default: foot)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const coordsParam = searchParams.get("coords") || "";
        const mode = (searchParams.get("mode") || "foot").toLowerCase();

        const parts = coordsParam
            .split(";")
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => p.split(",").map((n) => Number(n)) as [number, number]);

        if (parts.length < 2 || parts.some((p) => p.length !== 2 || p.some((n) => Number.isNaN(n)))) {
            return NextResponse.json({ success: false, error: "Invalid coords" }, { status: 400 });
        }

        const origin = { x: parts[0][0], y: parts[0][1] };
        const destination = { x: parts[parts.length - 1][0], y: parts[parts.length - 1][1] };
        const waypoints = parts.slice(1, -1).map((p, i) => ({ name: `wp${i + 1}`, x: p[0], y: p[1] }));

        const apiKey = process.env.KAKAO_MOBILITY_REST_KEY || process.env.KAKAO_REST_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: "Kakao Mobility key not configured" },
                { status: 500, headers: { "Cache-Control": "no-store" } }
            );
        }

        const endpoint =
            mode === "car"
                ? "https://apis-navi.kakaomobility.com/v1/route"
                : "https://apis-navi.kakaomobility.com/v1/walking";

        const payload: Record<string, unknown> = { origin, destination };
        if (waypoints.length > 0) payload.waypoints = waypoints;

        const apiRes = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `KakaoAK ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            cache: "no-store",
        });

        if (!apiRes.ok) {
            const text = await apiRes.text();
            return NextResponse.json(
                { success: false, error: `Kakao Mobility API error`, details: text },
                { status: apiRes.status }
            );
        }

        const data = await apiRes.json();
        // Extract coordinates from response (roads[].vertexes flattened [x1,y1,x2,y2,...])
        const coordinates: [number, number][] = [];
        try {
            const routes = (data as any)?.routes || (data as any)?.route || [];
            const first = routes[0];
            const sections = first?.sections || first?.section || [];
            for (const sec of sections) {
                const roads = sec?.roads || sec?.road || [];
                for (const r of roads) {
                    const v = r?.vertexes || r?.vertices || [];
                    for (let i = 0; i + 1 < v.length; i += 2) {
                        const x = Number(v[i]);
                        const y = Number(v[i + 1]);
                        if (!Number.isNaN(x) && !Number.isNaN(y)) coordinates.push([x, y]);
                    }
                }
            }
        } catch {}

        if (coordinates.length === 0) {
            // Fallback: straight polyline between points
            parts.forEach((p) => coordinates.push([p[0], p[1]]));
        }

        return NextResponse.json(
            { success: true, coordinates },
            { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500, headers: { "Cache-Control": "no-store" } }
        );
    }
}
