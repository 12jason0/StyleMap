import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { filterCoursesByImagePolicy, type ImagePolicy, type CourseWithPlaces } from "@/lib/imagePolicy";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const concept = searchParams.get("concept");
        const regionQuery = searchParams.get("region");
        const limitParam = searchParams.get("limit");
        const offsetParam = searchParams.get("offset");
        const noCache = searchParams.get("nocache");
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
            };
        });

        return NextResponse.json(formattedCourses, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...(noCache ? { "Cache-Control": "no-store", Pragma: "no-cache" } : {}),
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("API: /api/courses failed, returning empty list:", { message: errorMessage });
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, duration, location, imageUrl, concept } = body;
        if (!title) return NextResponse.json({ error: "제목은 필수입니다" }, { status: 400 });

        const userId = getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        const numericUserId = Number(userId);
        if (!Number.isFinite(numericUserId))
            return NextResponse.json({ error: "유효하지 않은 사용자 ID입니다." }, { status: 401 });

        const created = await prisma.course.create({
            data: {
                title,
                description: description || null,
                duration: duration || null,
                region: location || null,
                imageUrl: imageUrl || null,
                concept: concept || null,
                userId: numericUserId,
            } as any,
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
