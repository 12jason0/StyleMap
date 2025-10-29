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

        const [start, goal] = coords.split(";");
        if (!start || !goal) {
            return NextResponse.json({ error: "coords must include start and goal" }, { status: 400 });
        }

        console.log("📍 요청 좌표:");
        console.log("  - Start:", start);
        console.log("  - Goal:", goal);
        console.log("  - Mode:", mode);

        // 좌표 유효성 검사
        const [startLng, startLat] = start.split(",").map(Number);
        const [goalLng, goalLat] = goal.split(",").map(Number);

        if (!startLng || !startLat || !goalLng || !goalLat) {
            console.error("❌ 좌표 파싱 실패");
            return NextResponse.json({ coordinates: [], error: "INVALID_COORDS" });
        }

        console.log("📍 파싱된 좌표:");
        console.log("  - Start: lng=", startLng, "lat=", startLat);
        console.log("  - Goal: lng=", goalLng, "lat=", goalLat);

        // 거리 계산 (대략)
        const distance =
            Math.sqrt(Math.pow((goalLng - startLng) * 88.8, 2) + Math.pow((goalLat - startLat) * 111, 2)) * 1000;
        console.log("📏 직선 거리:", distance.toFixed(0), "m");

        // 🟢 직선 폴백 경로 생성 (9개 포인트)
        const createFallbackPath = (): Array<[number, number]> => {
            const points: Array<[number, number]> = [];
            for (let i = 0; i <= 8; i++) {
                const ratio = i / 8;
                const lng = startLng + (goalLng - startLng) * ratio;
                const lat = startLat + (goalLat - startLat) * ratio;
                points.push([lng, lat]);
            }
            return points;
        };

        // API 키가 없으면 바로 직선 반환
        if (!clientId || !clientSecret) {
            console.warn("⚠️ API 키 없음 - 직선 경로로 대체");
            return NextResponse.json({
                coordinates: createFallbackPath(),
                fallback: true,
            });
        }

        // --- API 선택 ---
        const endpoint =
            mode === "walking"
                ? `https://naveropenapi.apigw.ntruss.com/map-direction/v1/walking?start=${start}&goal=${goal}`
                : `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${start}&goal=${goal}&option=trafast`;

        console.log("🔵 API 요청:", endpoint);

        try {
            const response = await fetch(endpoint, {
                headers: {
                    "X-NCP-APIGW-API-KEY-ID": clientId,
                    "X-NCP-APIGW-API-KEY": clientSecret,
                },
                cache: "no-store",
            });

            const data = await response.json().catch(() => ({}));

            console.log("🔵 API 응답 상태:", response.status);
            console.log("🔵 API 응답 데이터:", JSON.stringify(data, null, 2));

            // 🟢 404나 다른 에러 시 직선 폴백
            if (!response.ok) {
                console.error("❌ Naver API 에러:", data);
                console.warn("⚠️ API 실패 - 직선 경로로 대체");
                return NextResponse.json({
                    coordinates: createFallbackPath(),
                    fallback: true,
                    error: data?.message,
                });
            }

            // API 응답에 route가 없으면 직선 폴백
            if (!data?.route) {
                console.error("❌ API 응답에 route 객체가 없음");
                console.warn("⚠️ route 없음 - 직선 경로로 대체");
                return NextResponse.json({
                    coordinates: createFallbackPath(),
                    fallback: true,
                    error: "NO_ROUTE_IN_RESPONSE",
                });
            }

            // --- 경로 추출 (모드별로 다른 구조 처리) ---
            let path: Array<[number, number]> | undefined = undefined;

            if (mode === "walking") {
                // Walking API 구조: { route: { trafast: [[lng, lat], ...] } }
                const route = data.route;
                console.log("🚶 Walking route 키들:", Object.keys(route));

                if (Array.isArray(route.trafast)) {
                    path = route.trafast;
                    console.log("✅ Walking 경로 찾음 (trafast):", path?.length ?? 0);
                } else if (Array.isArray(route.traoptimal)) {
                    path = route.traoptimal;
                    console.log("✅ Walking 경로 찾음 (traoptimal):", path?.length ?? 0);
                } else {
                    console.error("❌ Walking API 경로 형식 불일치:", route);
                }
            } else {
                // Driving API 구조: { route: { trafast: [{ path: [[lng, lat], ...] }] } }
                const route = data.route;
                console.log("🚗 Driving route 키들:", Object.keys(route));

                const preferKeys = ["trafast", "traoptimal", "tracomfort"];

                for (const k of preferKeys) {
                    const routeArray = route[k];
                    if (Array.isArray(routeArray) && routeArray.length > 0) {
                        const p = routeArray[0]?.path;
                        if (Array.isArray(p)) {
                            path = p;
                            console.log(`✅ Driving 경로 찾음 (${k}):`, path?.length ?? 0);
                            break;
                        }
                    }
                }

                if (!path) {
                    console.error("❌ Driving API 경로 형식 불일치:", route);
                }
            }

            // 백업: 혹시 다른 구조일 경우
            if (!path) {
                console.log("🔍 백업 경로 탐색 시작...");
                try {
                    const route = data.route;
                    for (const k of Object.keys(route)) {
                        console.log(`  - 키 "${k}" 확인 중...`);
                        // 배열 직접 체크
                        if (Array.isArray(route[k]) && route[k].length > 0) {
                            const firstItem = route[k][0];
                            // 좌표 배열인지 확인
                            if (Array.isArray(firstItem) && firstItem.length === 2) {
                                path = route[k];
                                console.log(`✅ 백업 경로 찾음 (${k}):`, path?.length ?? 0);
                                break;
                            }
                            // path 속성이 있는지 확인
                            if (firstItem?.path && Array.isArray(firstItem.path)) {
                                path = firstItem.path;
                                console.log(`✅ 백업 경로 찾음 (${k}.path):`, path?.length ?? 0);
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.error("백업 경로 탐색 실패:", e);
                }
            }

            // 🟢 경로를 찾았으면 반환, 못 찾았으면 직선 폴백
            if (Array.isArray(path) && path.length > 0) {
                console.log("✅ 최종 반환 경로:", path.length, "포인트");
                return NextResponse.json({ coordinates: path });
            } else {
                console.error("❌ 경로를 찾을 수 없음 - 직선 경로로 대체");
                return NextResponse.json({
                    coordinates: createFallbackPath(),
                    fallback: true,
                    error: "NO_PATH",
                });
            }
        } catch (fetchError: any) {
            console.error("❌ API 요청 실패:", fetchError);
            console.warn("⚠️ API 요청 실패 - 직선 경로로 대체");
            return NextResponse.json({
                coordinates: createFallbackPath(),
                fallback: true,
                error: fetchError.message,
            });
        }
    } catch (error: any) {
        console.error("❌ Directions API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
