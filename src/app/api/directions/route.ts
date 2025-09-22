import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

// 간단한 Directions 프록시: OSRM 데모 서버 사용
// 쿼리: /api/directions?coords=lon,lat;lon,lat[;...]&mode=driving|walking
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const coords = searchParams.get("coords") || "";
        const modeRaw = (searchParams.get("mode") || "walking").toLowerCase();

        // 입력 검증
        const pairs = coords
            .split(";")
            .map((p) => p.trim())
            .filter(Boolean);
        if (pairs.length < 2) {
            return NextResponse.json(
                { success: false, error: "At least two coordinates are required" },
                { status: 400 }
            );
        }
        // 모드 매핑 (큰길 우선: driving)
        const profile = modeRaw === "driving" ? "driving" : "walking";

        // OSRM 라우팅 호출
        const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${encodeURIComponent(
            pairs.join(";")
        )}?overview=full&geometries=geojson`;

        // --- ✨ 여기가 수정된 부분입니다 ✨ ---
        // "cache: 'no-store'" 와 "next: { revalidate: 0 }" 중 하나만 사용합니다.
        // 여기서는 cache: 'no-store'를 사용하여 캐시를 비활성화합니다.
        const res = await fetch(osrmUrl, { cache: "no-store" });
        // --- ✨ 수정 끝 ---

        if (!res.ok) {
            const text = await res.text();
            return NextResponse.json(
                { success: false, error: `Upstream error ${res.status}`, details: text.slice(0, 500) },
                { status: 502 }
            );
        }
        const data = await res.json();
        const route = data?.routes?.[0];
        const coordinates = route?.geometry?.coordinates;
        if (!Array.isArray(coordinates)) {
            return NextResponse.json({ success: false, error: "No route found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, coordinates });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Unknown error in directions" },
            { status: 500 }
        );
    }
}
