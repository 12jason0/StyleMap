import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const coords = searchParams.get("coords"); // "lng,lat;lng,lat"
        let mode = (searchParams.get("mode") || "driving").toLowerCase();

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

        // ✅ 도보 모드인데 거리가 15km 이상이면 운전 모드로 변경
        if (mode === "walking" && distance > 15000) {
            console.warn("⚠️ 도보 거리가 너무 멀어 운전 모드로 변경:", distance.toFixed(0), "m");
            mode = "driving";
        }
        // ✅ 근거리(기본 500m 미만)도 API를 호출해 보행로/도로를 정확히 따르도록 변경

        // API 키가 없으면 직선 폴백 대신 경로 없음 반환 (건물 통과 방지)
        if (!clientId || !clientSecret) {
            console.warn("⚠️ API 키 없음 - 경로 생략 (직선 폴백 사용 안 함)");
            return NextResponse.json({ coordinates: [], fallback: true, error: "NO_API_KEYS" });
        }
        // --- API 선택 ---
        const endpoint =
            mode === "walking"
                ? `https://naveropenapi.apigw.ntruss.com/map-direction/v1/walking?start=${start}&goal=${goal}`
                : `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${start}&goal=${goal}&option=trafast`;

        console.log("🔵 API 요청:", endpoint);

        try {
            const doFetch = async (ep: string) =>
                await fetch(ep, {
                    headers: {
                        "X-NCP-APIGW-API-KEY-ID": clientId,
                        "X-NCP-APIGW-API-KEY": clientSecret,
                    },
                    cache: "no-store",
                });
            let response = await doFetch(endpoint);
            let data = await response.json().catch(() => ({}));

            // 운전 경로에서 오류 발생 시(403/404/에러코드 230,300 등) 도보로 한 번 더 시도
            if (!response.ok && mode === "driving") {
                const errCode = (data?.error?.errorCode || data?.errorCode) as string | undefined;
                if (response.status === 403 || response.status === 404 || errCode === "230" || errCode === "300") {
                    const walkingEp = `https://naveropenapi.apigw.ntruss.com/map-direction/v1/walking?start=${start}&goal=${goal}`;
                    console.warn("🚶 Driving 오류 → Walking으로 재시도");
                    response = await doFetch(walkingEp);
                    data = await response.json().catch(() => ({}));
                    mode = "walking";
                }
            }

            console.log("🔵 API 응답 상태:", response.status);
            console.log("🔵 API 응답 데이터:", JSON.stringify(data, null, 2));

            // 🟢 에러(3xx/4xx/5xx) 시 직선 폴백 대신 경로 생략
            if (!response.ok) {
                const errCode = (data?.error?.errorCode || data?.errorCode) as string | undefined;
                const errMsg = (data?.error?.message || data?.message) as string | undefined;
                const errDetails = (data?.error?.details || data?.details) as string | undefined;
                const isNotFoundUrl =
                    errCode === "300" ||
                    /not\s*found/i.test(String(errMsg || "")) ||
                    /url\s*not\s*found/i.test(String(errDetails || ""));
                if (isNotFoundUrl) {
                    console.warn("⚠️ Naver API URL not found - 경로 생략:", { errCode, errMsg, errDetails });
                } else {
                    console.error("❌ Naver API 에러:", data);
                }
                return NextResponse.json({ coordinates: [], fallback: true, error: data?.message || response.status });
            }

            // API 응답에 route가 없으면 (짧은 거리 포함)
            if (!data?.route || data.route === null) {
                if (mode !== "walking") {
                    const walkingEp = `https://naveropenapi.apigw.ntruss.com/map-direction/v1/walking?start=${start}&goal=${goal}`;
                    console.warn("🚶 route 없음 → Walking으로 재시도");
                    const r = await doFetch(walkingEp);
                    const d = await r.json().catch(() => ({}));
                    if (r.ok && d?.route) {
                        data = d;
                        mode = "walking";
                    } else {
                        console.warn("⚠️ Walking 재시도 실패 - 경로 생략");
                        return NextResponse.json({ coordinates: [], fallback: true, reason: "NO_ROUTE" });
                    }
                } else {
                    console.warn("⚠️ route 없음 - 경로 생략");
                    return NextResponse.json({ coordinates: [], fallback: true, reason: "NO_ROUTE" });
                }
            }

            // --- 경로 추출 (모드별로 다른 구조 처리) ---
            let path: Array<[number, number]> | undefined = undefined;

            const route = data.route;
            console.log("🔍 route 객체 키들:", Object.keys(route));

            // ✅ 수정: Walking과 Driving 모두 동일한 구조 처리
            // 응답 구조: { route: { traoptimal/trafast: [{ path: [[lng,lat], ...], summary: {...} }] } }

            if (mode === "walking") {
                console.log("🚶 Walking 모드 - 경로 탐색 중...");

                // traoptimal 우선 확인
                if (Array.isArray(route.traoptimal) && route.traoptimal.length > 0) {
                    const routePath = route.traoptimal[0]?.path;
                    if (Array.isArray(routePath) && routePath.length > 0) {
                        path = routePath;
                        console.log("✅ Walking 경로 찾음 (traoptimal):", path.length, "포인트");
                    }
                }

                // trafast 백업
                if (!path && Array.isArray(route.trafast) && route.trafast.length > 0) {
                    const routePath = route.trafast[0]?.path;
                    if (Array.isArray(routePath) && routePath.length > 0) {
                        path = routePath;
                        console.log("✅ Walking 경로 찾음 (trafast):", path.length, "포인트");
                    }
                }
            } else {
                console.log("🚗 Driving 모드 - 경로 탐색 중...");

                // trafast 우선 확인
                if (Array.isArray(route.trafast) && route.trafast.length > 0) {
                    const routePath = route.trafast[0]?.path;
                    if (Array.isArray(routePath) && routePath.length > 0) {
                        path = routePath;
                        console.log("✅ Driving 경로 찾음 (trafast):", path.length, "포인트");
                    }
                }

                // traoptimal 백업
                if (!path && Array.isArray(route.traoptimal) && route.traoptimal.length > 0) {
                    const routePath = route.traoptimal[0]?.path;
                    if (Array.isArray(routePath) && routePath.length > 0) {
                        path = routePath;
                        console.log("✅ Driving 경로 찾음 (traoptimal):", path.length, "포인트");
                    }
                }

                // tracomfort 백업
                if (!path && Array.isArray(route.tracomfort) && route.tracomfort.length > 0) {
                    const routePath = route.tracomfort[0]?.path;
                    if (Array.isArray(routePath) && routePath.length > 0) {
                        path = routePath;
                        console.log("✅ Driving 경로 찾음 (tracomfort):", path.length, "포인트");
                    }
                }
            }

            // 백업: 모든 키를 순회하며 경로 찾기
            if (!path) {
                console.log("🔍 백업 경로 탐색 시작...");
                for (const key of Object.keys(route)) {
                    console.log(`  - 키 "${key}" 확인 중...`);

                    const routeData = route[key];

                    // 배열인지 확인
                    if (Array.isArray(routeData) && routeData.length > 0) {
                        const firstItem = routeData[0];

                        // path 속성이 있는지 확인
                        if (firstItem?.path && Array.isArray(firstItem.path) && firstItem.path.length > 0) {
                            path = firstItem.path;
                            console.log(`✅ 백업 경로 찾음 (${key}[0].path):`, firstItem.path.length, "포인트");
                            break;
                        }

                        // 직접 좌표 배열인지 확인
                        if (Array.isArray(firstItem) && firstItem.length === 2 && typeof firstItem[0] === "number") {
                            path = routeData;
                            console.log(`✅ 백업 경로 찾음 (${key} 직접):`, routeData.length, "포인트");
                            break;
                        }
                    }
                }
            }

            // 🟢 경로를 찾았으면 반환, 너무 짧거나 없으면 직선 폴백
            if (path && Array.isArray(path) && path.length > 2) {
                console.log("✅ 최종 반환 경로:", path.length, "포인트");
                return NextResponse.json({
                    coordinates: path,
                    summary: route.traoptimal?.[0]?.summary || route.trafast?.[0]?.summary,
                });
            }

            console.warn("⚠️ 경로 포인트가 부족합니다 — 직선 폴백으로 대체");
            return NextResponse.json({
                coordinates: createFallbackPath(),
                fallback: true,
                reason: "TOO_CLOSE_OR_NO_ROUTE",
            });
        } catch (fetchError: any) {
            console.error("❌ API 요청 실패:", fetchError);
            return NextResponse.json({ coordinates: [], fallback: true, error: fetchError.message });
        }
    } catch (error: any) {
        console.error("❌ Directions API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
