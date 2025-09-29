import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { filterCoursesByImagePolicy, type ImagePolicy, CourseWithPlaces } from "@/lib/imagePolicy";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(request: NextRequest) {
    try {
        console.log("API: Starting to fetch courses...");

        const { searchParams } = new URL(request.url);
        const concept = searchParams.get("concept");
        const regionQuery = searchParams.get("region");
        const limitParam = searchParams.get("limit");
        const offsetParam = searchParams.get("offset");
        const noCache = searchParams.get("nocache");
        const lean = searchParams.get("lean");
        const imagePolicy = searchParams.get("imagePolicy") as ImagePolicy;
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
            include: {
                tags: {
                    select: {
                        name: true,
                    },
                },
            },
        };

        if (imagePolicy === "none-or-all" || imagePolicy === "all-or-one-missing") {
            prismaQuery.include = {
                coursePlaces: {
                    include: { place: true },
                },
            };
        } else if (lean) {
            prismaQuery.select = {
                id: true,
                title: true,
                description: true,
                duration: true,
                region: true,
                price: true,
                imageUrl: true,
                concept: true,
                rating: true,
                current_participants: true,
                view_count: true,
            };
        }

        const results = await prisma.course.findMany(prismaQuery);

        // ✅ [수정됨] results의 타입을 명확히 하여 함수에 전달합니다.
        const imagePolicyApplied = filterCoursesByImagePolicy(results as CourseWithPlaces[], imagePolicy);

        // 코스 ID 수집 (태그 조인에 사용)
        const filteredIds: number[] = imagePolicyApplied
            .map((c: any) => (typeof c.id === "number" ? c.id : Number(c.id)))
            .filter((n) => Number.isFinite(n)) as number[];

        // 태그를 조인 테이블에서 직접 조회 (스키마/클라이언트 불일치 시에도 동작)
        let courseIdToTags = new Map<number, string[]>();
        if (filteredIds.length > 0) {
            try {
                const rows = (await prisma.$queryRaw<Array<{ course_id: number; name: string }>>(
                    Prisma.sql`SELECT j."B" AS course_id, ct.name
                               FROM "_CourseTagToCourses" j
                               JOIN "course_tags" ct ON ct.id = j."A"
                               WHERE j."B" IN (${Prisma.join(filteredIds)})`
                )) as Array<{ course_id: number; name: string }>;

                for (const row of rows) {
                    const list = courseIdToTags.get(row.course_id) ?? [];
                    list.push(row.name);
                    courseIdToTags.set(row.course_id, list);
                }
            } catch (e) {
                console.warn("Tag join query failed, proceeding without tags", e);
            }
        }

        const formattedCourses = imagePolicyApplied.map((course: any) => {
            const firstPlaceImage = Array.isArray(course?.coursePlaces)
                ? course.coursePlaces.find((cp: any) => cp?.place?.imageUrl)?.place?.imageUrl
                : undefined;
            const resolvedImageUrl = course.imageUrl || firstPlaceImage || "/images/maker.png";
            const idNumber = typeof course.id === "number" ? course.id : Number(course.id);

            return {
                id: String(course.id),
                title: course.title || "제목 없음",
                description: course.description || "",
                duration: course.duration || "",
                location: course.region || "",
                price: course.price || "",
                imageUrl: resolvedImageUrl,
                concept: course.concept || "",
                rating: Number(course.rating) || 0,
                reviewCount: 0,
                participants: course.current_participants || 0,
                viewCount: course.view_count || 0,
                view_count: course.view_count || 0,
                tags: courseIdToTags.get(idNumber) ?? [],
            };
        });

        console.log("API: Returning formatted courses:", formattedCourses.length);

        return NextResponse.json(formattedCourses, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...(noCache
                    ? { "Cache-Control": "no-store", Pragma: "no-cache" }
                    : { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" }),
                "X-Records": String(formattedCourses.length),
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("API: Detailed error in /api/courses:", { message: errorMessage });
        return NextResponse.json(
            { error: "코스 데이터를 가져오는 중 오류 발생", details: errorMessage },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, duration, location, price, imageUrl, concept } = body;

        if (!title) {
            return NextResponse.json({ error: "제목은 필수입니다" }, { status: 400 });
        }

        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const created = await prisma.course.create({
            data: {
                title,
                description: description || null,
                duration: duration || null,
                region: location || null,
                price: price || null,
                imageUrl: imageUrl || null,
                concept: concept || null,
                // ✅ [수정됨] userId를 Number로 명확하게 변환하여 타입 오류를 해결합니다.
                userId: Number(userId),
            },
        });

        return NextResponse.json(
            {
                id: String(created.id),
                title: created.title,
                description: created.description || "",
                duration: created.duration || "",
                location: created.region || "",
                price: created.price || "",
                imageUrl: created.imageUrl || "",
                concept: created.concept || "",
                rating: 0,
                reviewCount: 0,
                participants: 0,
            },
            { status: 201 }
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("코스 생성 오류:", error);
        return NextResponse.json({ error: "코스 생성 실패", details: errorMessage }, { status: 500 });
    }
}
