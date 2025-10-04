// src/app/api/courses/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { filterCoursesByImagePolicy, type ImagePolicy, type CourseWithPlaces } from "@/lib/imagePolicy";
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
                ...(regionQuery
                    ? {
                          region: {
                              contains: regionQuery,
                              mode: "insensitive",
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
                            },
                        },
                    },
                },
            },
        };

        // --- 캐시 키 구성: 주요 파라미터와 이미지 정책/페이징 포함 ---
        const cacheKey = `courses:${concept || "*"}:${
            regionQuery || "*"
        }:${imagePolicy}:${effectiveLimit}:${effectiveOffset}`;

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
            const resolvedImageUrl = course.imageUrl || firstPlaceImage || "/images/maker.png";

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
