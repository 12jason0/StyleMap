// src/app/api/courses/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { filterCoursesByImagePolicy, type ImagePolicy, type CourseWithPlaces } from "@/lib/imagePolicy";
import { sendPushNotificationToAll, sendPushNotificationToUsers } from "@/lib/push-notifications";
import { getUserIdFromRequest } from "@/lib/auth";
import { getUserPreferenceSet } from "@/lib/userProfile";
import { defaultCache } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const revalidate = 300;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        console.log(">>> API 함수 진입");
        console.log("--- [START] /api/courses GET 요청 수신 ---");

        const { searchParams } = new URL(request.url);
        const concept = searchParams.get("concept");
        const q = (searchParams.get("q") || "").trim();
        const tagIdsParam = (searchParams.get("tagIds") || "").trim(); // comma-separated ids
        const regionQuery = searchParams.get("region");
        const limitParam = searchParams.get("limit");
        const offsetParam = searchParams.get("offset");
        const noCache = searchParams.get("nocache");
        const imagePolicyParam = searchParams.get("imagePolicy");

        // --- imagePolicy 안전하게 처리 ---
        const allowedPolicies: ImagePolicy[] = ["any", "all", "none", "all-or-one-missing", "none-or-all"];

        const imagePolicy: ImagePolicy = allowedPolicies.includes(imagePolicyParam as ImagePolicy)
            ? (imagePolicyParam as ImagePolicy)
            : "any"; // 기본값 "any"

        const parsedLimit = Number(limitParam ?? 100);
        const effectiveLimit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 100, 1), 200);
        const parsedOffset = Number(offsetParam ?? 0);
        const effectiveOffset = Math.max(Number.isFinite(parsedOffset) ? parsedOffset : 0, 0);

        const prismaQuery: any = {
            where: {
                ...(concept ? { concept } : {}),
                ...(q
                    ? {
                          OR: [
                              { title: { contains: q, mode: "insensitive" } },
                              { description: { contains: q, mode: "insensitive" } },
                              { concept: { contains: q, mode: "insensitive" } },
                              { region: { contains: q, mode: "insensitive" } },
                              // 포함된 장소 이름/주소까지 검색 범위 확장
                              {
                                  coursePlaces: {
                                      some: {
                                          place: {
                                              OR: [
                                                  { name: { contains: q, mode: "insensitive" } },
                                                  { address: { contains: q, mode: "insensitive" } },
                                              ],
                                          },
                                      },
                                  },
                              },
                          ],
                      }
                    : {}),
                ...(regionQuery
                    ? {
                          region: {
                              contains: regionQuery,
                              mode: "insensitive",
                          },
                      }
                    : {}),
                ...(tagIdsParam
                    ? {
                          // 코스가 선택된 태그 중 하나라도 매칭되면 포함
                          CourseTagToCourses: {
                              some: {
                                  course_tags: {
                                      id: { in: tagIdsParam.split(",").map((v) => Number(v)).filter((n) => Number.isFinite(n)) },
                                  },
                              },
                          },
                      }
                    : {}),
            },
            orderBy: [{ id: "desc" }],
            take: effectiveLimit,
            skip: effectiveOffset,
            select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                region: true,
                imageUrl: true,
                concept: true,
                rating: true,
                current_participants: true,
                view_count: true,
                createdAt: true,
                CourseTagToCourses: {
                    select: {
                        course_tags: { select: { id: true, name: true } },
                    },
                },
                coursePlaces: {
                    orderBy: { order_index: "asc" },
                    select: {
                        order_index: true,
                        place: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                                latitude: true,
                                longitude: true,
                                opening_hours: true,
                                closed_days: {
                                    select: {
                                        day_of_week: true,
                                        specific_date: true,
                                        note: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };

        // --- 캐시 키 구성: 주요 파라미터와 이미지 정책/페이징 포함 ---
        const cacheKey = `courses:${concept || "*"}:${regionQuery || "*"}:${q || "*"}:${tagIdsParam || "*"}:${imagePolicy}:${
            effectiveLimit
        }:${effectiveOffset}`;

        let results: any[] | undefined = defaultCache.get<any[]>(cacheKey);
        if (!results) {
            console.log("[LOG] Cache miss → Prisma 쿼리 실행");
            results = await prisma.course.findMany(prismaQuery);
            defaultCache.set(cacheKey, results);
        } else {
            console.log("[LOG] Cache hit → 메모리 캐시 사용");
        }
        console.log(`[LOG] Prisma 쿼리 성공. ${results.length}개 데이터 수신.`);

        const imagePolicyApplied = filterCoursesByImagePolicy(results as CourseWithPlaces[], imagePolicy);

        const formattedCourses = imagePolicyApplied.map((course: any) => {
            const firstPlaceImage = Array.isArray(course?.coursePlaces)
                ? course.coursePlaces.find((cp: any) => cp?.place?.imageUrl)?.place?.imageUrl
                : undefined;
            const resolvedImageUrl = course.imageUrl || firstPlaceImage || ""; // 빈 값이면 프론트에서 회색 div 처리

            return {
                id: String(course.id),
                title: course.title || "제목 없음",
                description: course.description || "",
                duration: course.duration || "",
                location: course.region || "",
                imageUrl: resolvedImageUrl,
                concept: course.concept || "",
                rating: Number(course.rating) || 0,
                reviewCount: 0,
                participants: course.current_participants || 0,
                view_count: course.view_count || 0,
                viewCount: course.view_count || 0,
                createdAt: course.createdAt,
                tags: Array.isArray(course?.CourseTagToCourses)
                    ? course.CourseTagToCourses.map((ctc: any) => ctc.course_tags?.name).filter(Boolean)
                    : [],
                coursePlaces: Array.isArray(course.coursePlaces)
                    ? course.coursePlaces.map((cp: any) => ({
                          order_index: cp.order_index,
                          place: cp.place
                              ? {
                                    id: cp.place.id,
                                    name: cp.place.name,
                                    imageUrl: cp.place.imageUrl,
                                    latitude: cp.place.latitude ? Number(cp.place.latitude) : undefined,
                                    longitude: cp.place.longitude ? Number(cp.place.longitude) : undefined,
                                    opening_hours: cp.place.opening_hours || null,
                                    closed_days: Array.isArray(cp.place.closed_days)
                                        ? cp.place.closed_days.map((cd: any) => ({
                                              day_of_week: cd.day_of_week,
                                              specific_date: cd.specific_date,
                                              note: cd.note || null,
                                          }))
                                        : [],
                                }
                              : null,
                      }))
                    : [],
            };
        });

        // --- 개인화 정렬: 사용자 선호 concept에 가산점 반영 ---
        let responseList = formattedCourses;
        try {
            const userIdStr = getUserIdFromRequest(request);
            if (userIdStr && Number.isFinite(Number(userIdStr))) {
                const prefSet = await getUserPreferenceSet(Number(userIdStr));
                if (prefSet.size > 0) {
                    responseList = [...formattedCourses].sort((a: any, b: any) => {
                        const boostA = prefSet.has(a.concept) ? 10 : 0;
                        const boostB = prefSet.has(b.concept) ? 10 : 0;
                        const scoreA = boostA + (a.viewCount || 0) * 0.01 + (a.rating || 0) * 0.5;
                        const scoreB = boostB + (b.viewCount || 0) * 0.01 + (b.rating || 0) * 0.5;
                        return scoreB - scoreA;
                    });
                }
            }
        } catch {}

        console.log("--- [SUCCESS] /api/courses 요청 처리 완료 ---");

        return NextResponse.json(responseList, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...(noCache ? { "Cache-Control": "no-store", Pragma: "no-cache" } : {}),
            },
        });
    } catch (error) {
        console.error("--- [ERROR] /api/courses GET 요청 처리 중 심각한 오류 발생 ---");
        console.error("Full error:", error);

        return new NextResponse(
            JSON.stringify({
                message: "Internal Server Error",
                error: error instanceof Error ? error.message : String(error),
            }),
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const userIdStr = getUserIdFromRequest(request);
        if (!userIdStr) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, duration, location, price, imageUrl, concept } = body || {};

        if (!title) {
            return NextResponse.json({ error: "코스 제목은 필수입니다." }, { status: 400 });
        }

        const created = await prisma.course.create({
            data: {
                title,
                description: description || null,
                duration: duration || null,
                region: location || null,
                imageUrl: imageUrl || null,
                concept: concept || null,
                userId: Number(userIdStr),
            },
            select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                region: true,
                imageUrl: true,
                concept: true,
                createdAt: true,
            },
        });

        // 캐시 무효화: 간단히 전체 키 삭제
        defaultCache.clear?.();

        // 🔔 지역 기반 타겟 사용자에게만 푸시 알림 보내기
        try {
            const region = created.region?.trim();
            if (region) {
                // 1) User.location 이 해당 지역인 사용자
                const usersByProfile = await prisma.user
                    .findMany({
                        where: { location: region },
                        select: { id: true },
                    })
                    .catch(() => [] as { id: number }[]);

                // 2) 해당 지역 코스에 상호작용(조회/클릭/좋아요/시청시간 등)이 있는 사용자 (중복 제거)
                const usersByInteraction = await prisma.userInteraction
                    .findMany({
                        where: {
                            course: { region },
                        },
                        select: { userId: true },
                        distinct: ["userId"],
                    })
                    .catch(() => [] as { userId: number }[]);

                const targetUserIds = Array.from(
                    new Set<number>([
                        ...usersByProfile.map((u) => u.id),
                        ...usersByInteraction.map((u) => u.userId),
                    ])
                );

                if (targetUserIds.length > 0) {
                    await sendPushNotificationToUsers(
                        targetUserIds,
                        "내 활동 지역에 새 코스가 생겼어요! 🎉",
                        `${created.title} - 지금 확인해보세요`,
                        { screen: "courses", courseId: created.id, region }
                    );
                    console.log(`푸시 알림 전송 성공(타겟 ${targetUserIds.length}명):`, created.title, region);
                } else {
                    console.log("타겟 사용자 없음 → 푸시 생략", { region });
                }
            } else {
                console.log("코스 지역 정보 없음 → 푸시 생략");
            }
        } catch (error) {
            console.error("푸시 알림 전송 실패(타겟):", error);
            // 알림 실패해도 코스 생성은 성공으로 처리
        }

        return NextResponse.json({ success: true, course: created }, { status: 201 });
    } catch (error) {
        console.error("API: 코스 생성 오류:", error);
        return NextResponse.json({ error: "코스 생성 실패" }, { status: 500 });
    }
}
