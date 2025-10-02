// ✅ [수정] 필요한 모듈들을 import 합니다.
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id: courseId } = params;

        // id가 숫자가 아닌 경우를 대비한 방어 코드
        if (isNaN(Number(courseId))) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        // 조회수 1 증가 (비로그인 포함)
        try {
            await prisma.course.update({ where: { id: Number(courseId) }, data: { view_count: { increment: 1 } } });
        } catch (e) {
            // 조회수 증가에 실패하더라도 코스 상세 정보 조회는 계속 진행합니다.
            console.warn("View count increment failed for course", courseId, e);
        }

        const course = await prisma.course.findUnique({
            where: { id: Number(courseId) },
            include: {
                highlights: true,
                benefits: true,
                courseNotices: true,
                coursePlaces: { include: { place: true }, orderBy: { order_index: "asc" } },
                _count: { select: { coursePlaces: true } },
            },
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const formattedCourse = {
            id: course.id.toString(),
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
            placeCount: (course as any)._count?.coursePlaces ?? (course.coursePlaces?.length || 0),
            createdAt: course.createdAt,
            updatedAt: course.updatedAt,
        };

        const coursePlaces = course.coursePlaces.map((cp) => ({
            id: cp.id,
            course_id: cp.course_id,
            place_id: cp.place_id,
            order_index: cp.order_index,
            estimated_duration: cp.estimated_duration,
            recommended_time: cp.recommended_time,
            notes: cp.notes,
            place: {
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
                latitude: Number(cp.place.latitude),
                longitude: Number(cp.place.longitude),
                imageUrl: cp.place.imageUrl || "", // ✅ 중복된 속성 중 하나만 남겼습니다.
            },
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
        // ✅ [개선] 에러 발생 시 터미널에 로그를 남겨서 디버깅이 쉽도록 합니다.
        console.error(`API Error fetching course ${params.id}:`, error);
        return NextResponse.json(
            {
                error: "Failed to fetch course",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
