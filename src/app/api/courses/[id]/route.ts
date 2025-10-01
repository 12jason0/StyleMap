import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;

        // ✅ [수정됨] prisma.courses -> prisma.course
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
            price: course.price || "",
            imageUrl: course.imageUrl || "",
            concept: course.concept || "",
            rating: Number(course.rating) || 0,
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
                image_url: cp.place.imageUrl || "",
                imageUrl: cp.place.imageUrl || "",
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
        return NextResponse.json(
            {
                error: "Failed to fetch course",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
