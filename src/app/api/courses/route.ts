import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { filterCoursesByImagePolicy, type ImagePolicy } from "@/lib/imagePolicy";
import { getUserIdFromRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const revalidate = 300; // ISR for GET (5분)

export async function GET(request: NextRequest) {
    try {
        console.log("API: Starting to fetch courses...");

        const { searchParams } = new URL(request.url);
        const concept = searchParams.get("concept");
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
            },
            orderBy: [{ id: "desc" }],
            take: effectiveLimit,
            skip: effectiveOffset,
        };

        if (imagePolicy === "none-or-all" || imagePolicy === "all-or-one-missing") {
            // 이미지 정책 검증을 위해 장소와 이미지 포함
            prismaQuery.include = {
                course_places: {
                    include: { places: true },
                },
            } as any;
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

        // DB 조회 + 부가 데이터는 병렬 준비
        const [results] = await Promise.all([
            prisma.courses.findMany(prismaQuery),
            // 향후 필요시 추가 병렬 작업을 여기에 배치
        ]);

        // 이미지 정책 적용: 코스 내 장소 이미지가 하나도 없거나 전부 있는 코스만 허용
        const imagePolicyApplied = filterCoursesByImagePolicy(results as any[], imagePolicy);

        // [수정됨] 복잡한 이미지 필터링 로직을 제거하고 조회된 결과를 바로 포맷팅합니다.
        const formattedCourses = imagePolicyApplied.map((course: any) => ({
            id: String(course.id),
            title: course.title || "제목 없음",
            description: course.description || "",
            duration: course.duration || "",
            location: course.region || "",
            price: course.price || "",
            imageUrl: course.imageUrl || "",
            concept: course.concept || "",
            rating: Number(course.rating) || 0,
            reviewCount: 0, // 이 값은 나중에 별도 로직으로 채워야 합니다.
            participants: course.current_participants || 0,
            viewCount: course.view_count || 0,
        }));

        console.log("API: Returning formatted courses:", formattedCourses.length);

        // 모든 클라이언트(Home, Courses, Nearby)가 기대하는 형태(배열)로 통일 응답
        return NextResponse.json(formattedCourses, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...(noCache
                    ? { "Cache-Control": "no-store", Pragma: "no-cache" }
                    : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }),
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

// POST 함수는 그대로 둡니다.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, duration, location, price, imageUrl, concept } = body;

        // 입력값 검증
        if (!title) {
            return NextResponse.json({ error: "제목은 필수입니다" }, { status: 400 });
        }

        // 인증 필요
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const created = await prisma.courses.create({
            data: {
                title,
                description: description || null,
                duration: duration || null,
                region: location || null,
                price: price || null,
                imageUrl: imageUrl || null,
                concept: concept || null,
            },
        } as any);

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
