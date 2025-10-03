// src/app/api/courses/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } // ✅ Promise 타입으로 선언
) {
    try {
        const { id: courseId } = await context.params;

        // id가 숫자가 아닌 경우 방어 코드
        if (isNaN(Number(courseId))) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        // 조회수 1 증가 (에러는 무시)
        try {
            await prisma.course.update({
                where: { id: Number(courseId) },
                data: { view_count: { increment: 1 } },
            });
        } catch (e) {
            console.warn("View count increment failed for course", courseId, e);
        }

        const course = await prisma.course.findUnique({
            where: { id: Number(courseId) },
            include: {
                highlights: true,
                benefits: true,
                courseNotices: true,
                coursePlaces: {
                    include: { place: true },
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
            id: course.id.toString(),
            title: course.title || "",
            description: course.description || "",
            duration: course.duration || "",
            location: course.region || "",
            imageUrl: course.imageUrl || "/images/maker.png", // ✅ 기본 이미지 fallback
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
            placeCount: (course as any)._count?.coursePlaces ?? (course.coursePlaces?.length || 0),
            createdAt: course.createdAt,
            updatedAt: course.updatedAt,
        };

        // 코스 장소들 가공
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
                      // ✅ DB 값 있으면 그대로, 없으면 fallback
                      imageUrl:
                          cp.place.imageUrl && cp.place.imageUrl.trim() !== ""
                              ? cp.place.imageUrl
                              : "/images/maker.png",
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
