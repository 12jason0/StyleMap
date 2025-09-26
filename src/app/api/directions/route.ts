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
        // 모드 매핑
        // 보행 시 건물 관통 직선이 아닌 보행 네트워크를 따라가도록 우선 foot 프로필을 시도하고,
        // 실패 시 walking 프로필로 폴백합니다.
        const profiles = modeRaw === "driving" ? ["driving"] : ["foot", "walking"];

        // OSRM 라우팅 호출 (여러 프로필 순차 시도)
        let lastErrorText: string | null = null;
        for (const profile of profiles) {
            const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${encodeURIComponent(
                pairs.join(";")
            )}?overview=full&geometries=geojson`;
            const res = await fetch(osrmUrl, { cache: "no-store" });
            if (!res.ok) {
                lastErrorText = await res.text();
                continue;
            }
            const data = await res.json();
            const route = data?.routes?.[0];
            const coordinates = route?.geometry?.coordinates;
            if (Array.isArray(coordinates)) {
                return NextResponse.json({ success: true, coordinates, profile });
            }
        }
        return NextResponse.json(
            { success: false, error: "No route found", details: lastErrorText?.slice(0, 500) || null },
            { status: 404 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Unknown error in directions" },
            { status: 500 }
        );
    }
}
