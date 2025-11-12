// src/app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // ✅ Promise 제거
) {
    try {
        const { id } = await params;
        const courseId = Number(id);

        if (!courseId || isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        // 조회수 증가 (실패해도 무시)
        try {
            await prisma.course.update({
                where: { id: courseId },
                data: { view_count: { increment: 1 } },
            });
        } catch (e) {
            console.warn("View count increment failed for course", courseId, e);
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                highlights: true,
                benefits: true,
                courseNotices: true,
                coursePlaces: {
                    include: {
                        place: {
                            include: {
                                closed_days: true,
                            },
                        },
                    },
                    orderBy: { order_index: "asc" },
                },
                _count: { select: { coursePlaces: true } },
            },
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // 기본 course 정보
        const formattedCourse = {
            id: String(course.id),
            title: course.title || "",
            description: course.description || "",
            duration: course.duration || "",
            location: course.region || "",
            imageUrl: course.imageUrl || "",
            concept: course.concept || "",
            rating: Number(course.rating) || 0,
            view_count: course.view_count || 0,
            reviewCount: 0,
            participants: course.current_participants || 0,
            maxParticipants: course.max_participants || 10,
            isPopular: (course.current_participants || 0) > 5,
            recommendedTime: "오후 2시-6시",
            season: "사계절",
            courseType: "일반",
            transportation: "대중교통",
            parking: "주차 가능",
            reservationRequired: false,
            placeCount: course._count?.coursePlaces ?? (course.coursePlaces?.length || 0),
            createdAt: course.createdAt,
            updatedAt: course.updatedAt,
        };

        // 코스 장소 가공
        const coursePlaces = course.coursePlaces.map((cp) => ({
            id: cp.id,
            course_id: cp.course_id,
            place_id: cp.place_id,
            order_index: cp.order_index,
            estimated_duration: cp.estimated_duration,
            recommended_time: cp.recommended_time,
            notes: cp.notes,
            place: cp.place
                ? {
                      id: cp.place.id,
                      name: cp.place.name,
                      address: cp.place.address,
                      description: cp.place.description,
                      category: cp.place.category,
                      avg_cost_range: cp.place.avg_cost_range,
                      opening_hours: cp.place.opening_hours,
                      phone: cp.place.phone,
                      parking_available: !!cp.place.parking_available,
                      reservation_required: !!cp.place.reservation_required,
                      latitude: cp.place.latitude ? Number(cp.place.latitude) : null,
                      longitude: cp.place.longitude ? Number(cp.place.longitude) : null,
                      imageUrl: cp.place.imageUrl?.trim() ? cp.place.imageUrl : "",
                      closed_days: (cp.place as any).closed_days || [],
                  }
                : null,
        }));

        const payload = {
            ...formattedCourse,
            highlights: course.highlights || [],
            benefits: course.benefits || [],
            notices: course.courseNotices || [],
            coursePlaces,
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("API Error fetching course:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch course",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const userIdStr = getUserIdFromRequest(request);
        if (!userIdStr) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const courseId = Number(params.id);
        if (!courseId || isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        const body = await request.json();
        const { title, description, duration, location, imageUrl, concept } = body || {};

        const updated = await prisma.course.update({
            where: { id: courseId },
            data: {
                ...(title !== undefined ? { title } : {}),
                ...(description !== undefined ? { description } : {}),
                ...(duration !== undefined ? { duration } : {}),
                ...(location !== undefined ? { region: location } : {}),
                ...(imageUrl !== undefined ? { imageUrl } : {}),
                ...(concept !== undefined ? { concept } : {}),
            },
            select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                region: true,
                imageUrl: true,
                concept: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({ success: true, course: updated });
    } catch (error) {
        console.error("API: 코스 수정 오류:", error);
        return NextResponse.json({ error: "코스 수정 실패" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const userIdStr = getUserIdFromRequest(request);
        if (!userIdStr) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const courseId = Number(params.id);
        if (!courseId || isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        await prisma.course.delete({ where: { id: courseId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API: 코스 삭제 오류:", error);
        return NextResponse.json({ error: "코스 삭제 실패" }, { status: 500 });
    }
}
