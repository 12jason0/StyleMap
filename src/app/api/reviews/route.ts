import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        console.log("API: Starting to fetch reviews...");

        // URL 파라미터에서 limit 가져오기
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get("limit");
        const courseIdFilter = searchParams.get("courseId");

        const me = getUserIdFromRequest(request);

        const reviewsArray = (await (prisma as any).review.findMany({
            where: courseIdFilter ? { courseId: Number(courseIdFilter) } : undefined,
            take: limit ? Number(limit) : undefined,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { nickname: true } },
                course: { select: { title: true, concept: true } },
            },
        })) as any[];

        console.log("API: Found reviews:", reviewsArray.length);

        // 데이터 포맷팅
        const formattedReviews = reviewsArray.map((review) => ({
            id: review.id.toString(),
            userId: String(review.userId),
            courseId: String(review.courseId),
            rating: review.rating,
            comment: review.comment || "",
            createdAt: review.createdAt,
            isMine: me ? Number(me) === Number(review.userId) : false,
            user: {
                nickname: review.user?.nickname || "익명",
                initial: (review.user?.nickname || "익")[0],
            },
            course: {
                title: review.course?.title || "알 수 없는 코스",
                concept: review.course?.concept || "기타",
            },
        }));

        console.log("API: Returning formatted reviews:", formattedReviews.length);

        return NextResponse.json(formattedReviews, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // 5분 캐시, 10분 stale-while-revalidate
            },
        });
    } catch (error) {
        console.error("API: Error fetching reviews:", error);
        return NextResponse.json({ error: "리뷰 데이터를 가져오는 중 오류 발생" }, { status: 500 });
    }
}

// 후기 생성
export async function POST(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

        const body = await request.json().catch(() => null);
        if (!body) return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });

        const { courseId, placeId, rating, content } = body as {
            courseId?: number;
            placeId?: number;
            rating?: number;
            content?: string;
        };

        if (!courseId || !rating || typeof content !== "string") {
            return NextResponse.json({ error: "필수 값 누락" }, { status: 400 });
        }

        // Prisma 모델명에 맞춰 저장 (Review 모델 사용 중)
        const created = await (prisma as any).review.create({
            data: {
                userId: Number(userId),
                courseId: Number(courseId),
                rating: Math.max(1, Math.min(5, Number(rating))),
                comment: content.trim(),
            },
        });

        return NextResponse.json({ success: true, id: created.id }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "후기 저장 실패" }, { status: 500 });
    }
}

// 후기 수정
export async function PATCH(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

        const body = await request.json().catch(() => null);
        if (!body) return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });

        const { id, rating, content } = body as { id?: number; rating?: number; content?: string };
        if (!id || !rating || typeof content !== "string") {
            return NextResponse.json({ error: "필수 값 누락" }, { status: 400 });
        }

        // 소유자 검증
        const review = await (prisma as any).review.findUnique({ where: { id: Number(id) } });
        if (!review || Number(review.userId) !== Number(userId)) {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        await (prisma as any).review.update({
            where: { id: Number(id) },
            data: { rating: Math.max(1, Math.min(5, Number(rating))), comment: content.trim() },
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "후기 수정 실패" }, { status: 500 });
    }
}

// 후기 삭제
export async function DELETE(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const idParam = searchParams.get("id");
        const id = idParam ? Number(idParam) : NaN;
        if (!Number.isFinite(id)) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

        const review = await (prisma as any).review.findUnique({ where: { id } });
        if (!review || Number(review.userId) !== Number(userId)) {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        await (prisma as any).review.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "후기 삭제 실패" }, { status: 500 });
    }
}
