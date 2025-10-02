import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { filterCoursesByImagePolicy, type ImagePolicy, type CourseWithPlaces } from "@/lib/imagePolicy";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 300;
export const runtime = "nodejs";

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

        const results = await prisma.course.findMany(prismaQuery);
        const imagePolicyApplied = filterCoursesByImagePolicy(results as CourseWithPlaces[], imagePolicy);
        const filteredIds: number[] = imagePolicyApplied
            .map((c: any) => (typeof c.id === "number" ? c.id : Number(c.id)))
            .filter((n) => Number.isFinite(n)) as number[];

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
                imageUrl: resolvedImageUrl,
                concept: course.concept || "",
                rating: Number(course.rating) || 0,
                reviewCount: 0,
                participants: course.current_participants || 0,
                view_count: course.view_count || 0,
                viewCount: course.view_count || 0,
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
        console.error("API: /api/courses failed, returning empty list:", { message: errorMessage });
        // 🚨 중요: 오류 발생 시 500 대신 200과 빈 배열을 반환하여 프론트엔드 오류를 방지
        return NextResponse.json([], {
            status: 200,
            headers: { "Content-Type": "application/json", "X-Error": String(errorMessage) },
        });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, duration, location, imageUrl, concept } = body;

        if (!title) {
            return NextResponse.json({ error: "제목은 필수입니다" }, { status: 400 });
        }

        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        // --- 👇 여기에 유효성 검사 추가 ---
        const numericUserId = Number(userId);
        if (!Number.isFinite(numericUserId)) {
            return NextResponse.json({ error: "유효하지 않은 사용자 ID입니다." }, { status: 401 });
        }
        // --- 👆 여기까지 추가 ---

        const created = await prisma.course.create({
            data: {
                title,
                description: description || null,
                duration: duration || null,
                region: location || null,
                imageUrl: imageUrl || null,
                concept: concept || null,
                userId: numericUserId, // 수정된 변수 사용
            },
        });

        return NextResponse.json(
            {
                id: String(created.id),
                title: created.title,
                description: created.description || "",
                duration: created.duration || "",
                location: created.region || "",
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
