import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        console.log("API: Starting to fetch courses...");

        // URL 파라미터에서 concept과 limit 가져오기
        const { searchParams } = new URL(request.url);
        const concept = searchParams.get("concept");
        const limitParam = searchParams.get("limit");
        const offsetParam = searchParams.get("offset");
        const noCache = searchParams.get("nocache");
        const noFilter = searchParams.get("noFilter");
        const lean = searchParams.get("lean");
        const parsedLimit = Number(limitParam ?? 100);
        const effectiveLimit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 100, 1), 200);
        const parsedOffset = Number(offsetParam ?? 0);
        const effectiveOffset = Math.max(Number.isFinite(parsedOffset) ? parsedOffset : 0, 0);

        // Prisma로 조회 (컨셉 필터 + 이미지 조건)
        const results = await prisma.courses.findMany({
            where: {
                ...(concept ? { concept } : {}),
            },
            orderBy: [{ id: "desc" }, { title: "asc" }],
            take: effectiveLimit,
            skip: effectiveOffset,
            ...((lean
                ? {
                      select: {
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
                      },
                  }
                : {
                      include: {
                          course_places: {
                              include: { places: true },
                          },
                      },
                  }) as any),
        } as any);

        let usableResults: any[] = results as any[];
        if (!noFilter && !lean) {
            // 요구사항: 장소 imageUrl이 모두 있거나 최대 1개만 없는 코스만 노출
            const filtered = (results as any[]).filter((c) => {
                const places: any[] = (c as any).course_places || [];
                if (places.length === 0) return false;
                const total = places.length;
                const missing = places.filter((cp: any) => !cp.places?.imageUrl).length;
                // 모든 장소에 이미지가 있거나(missing === 0) 최대 1개만 없는 경우(missing === 1)
                return missing === 0 || missing === 1;
            });

            usableResults = filtered.length > 0 ? filtered : results;
        }

        const formattedCourses = usableResults.map((course) => ({
            id: String(course.id),
            title: course.title || "제목 없음",
            description: course.description || "",
            duration: course.duration || "",
            location: course.region || "",
            price: course.price || "",
            imageUrl: course.imageUrl || "",
            concept: course.concept || "",
            rating: Number(course.rating) || 0,
            reviewCount: 0,
            participants: course.current_participants || 0,
            viewCount: 0,
        }));

        console.log("API: Returning formatted courses:", formattedCourses.length);

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
        const errorCode = (error as { code?: string })?.code;
        const errorSqlState = (error as { sqlState?: string })?.sqlState;
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error("API: Detailed error:", {
            message: errorMessage,
            code: errorCode,
            sqlState: errorSqlState,
            stack: errorStack,
        });

        // 연결 오류인지 쿼리 오류인지 구분
        if (errorCode === "ECONNREFUSED") {
            return NextResponse.json(
                { error: "데이터베이스 연결 실패", details: "DB 서버가 실행중인지 확인해주세요" },
                { status: 503 }
            );
        } else if (errorCode === "ER_NO_SUCH_TABLE") {
            return NextResponse.json(
                { error: "테이블이 존재하지 않음", details: "courses 테이블을 생성해주세요" },
                { status: 500 }
            );
        } else {
            return NextResponse.json(
                { error: "코스 데이터를 가져오는 중 오류 발생", details: errorMessage },
                { status: 500 }
            );
        }
    } finally {
    }
}

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
    } finally {
    }
}
