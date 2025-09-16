import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("API: Fetching course with ID:", courseId);
        console.log("API: Course ID type:", typeof courseId);
        console.log("API: Request URL:", request.url);

        const course = await prisma.courses.findUnique({
            where: { id: Number(courseId) },
            include: {
                highlights: true,
                benefits: true,
                course_notices: true,
                course_places: { include: { places: true }, orderBy: { order_index: "asc" } },
                _count: { select: { course_places: true } },
            } as any,
        } as any);

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }
        console.log("API: Selected course:", course);

        // 코스 상세 정보 포맷팅 (실제 데이터베이스 스키마에 맞춤)
        const formattedCourse = {
            id: course.id.toString(),
            title: course.title || "",
            description: course.description || "",
            duration: course.duration || "",
            location: course.region || "", // region 필드를 location으로 매핑
            price: course.price || "",
            imageUrl: course.imageUrl || "",
            concept: course.concept || "",
            rating: Number(course.rating) || 0,
            reviewCount: 0,
            participants: course.current_participants || 0,
            maxParticipants: course.max_participants || 10,
            isPopular: course.current_participants > 5, // 참가자가 5명 이상이면 인기 코스로 설정
            recommendedTime: "오후 2시-6시", // 기본값
            season: "사계절", // 기본값
            courseType: "일반", // 기본값
            transportation: "대중교통", // 기본값
            parking: "주차 가능", // 기본값
            reservationRequired: false, // 기본값
            placeCount: (course as any)._count?.course_places ?? ((course as any).course_places?.length || 0),
            createdAt: course.createdAt as any,
            updatedAt: course.updatedAt as any,
        };

        const coursePlaces = (course as any).course_places.map((cp: any) => ({
            id: cp.id,
            course_id: cp.course_id,
            place_id: cp.place_id,
            order_index: cp.order_index,
            estimated_duration: cp.estimated_duration,
            recommended_time: cp.recommended_time,
            notes: cp.notes,
            place: {
                id: cp.places.id,
                name: cp.places.name,
                address: cp.places.address,
                description: cp.places.description,
                category: cp.places.category,
                avg_cost_range: cp.places.avg_cost_range,
                opening_hours: cp.places.opening_hours,
                phone: cp.places.phone,
                parking_available: !!cp.places.parking_available,
                reservation_required: !!cp.places.reservation_required,
                latitude: Number(cp.places.latitude),
                longitude: Number(cp.places.longitude),
                image_url: cp.places.imageUrl || "",
                imageUrl: cp.places.imageUrl || "",
            },
        }));

        const payload = {
            ...formattedCourse,
            highlights: (course as any).highlights || [],
            benefits: (course as any).benefits || [],
            notices: (course as any).course_notices || [], // [수정] 'course.notices' -> 'course.course_notices'
            coursePlaces,
        };

        console.log("API: Returning aggregated course payload");
        return NextResponse.json(payload);
    } catch (error) {
        console.error("API: Error fetching course:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch course",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        const body = await request.json();
        const { title, description, duration, location, price, imageUrl, concept, rating, current_participants } = body;

        await prisma.courses.update({
            where: { id: Number(courseId) },
            data: {
                title,
                description,
                duration,
                region: location,
                price,
                imageUrl,
                concept,
                rating,
                current_participants,
            },
        } as any);

        return NextResponse.json({ id: courseId, message: "Course updated successfully" });
    } catch (error) {
        console.error("Error updating course:", error);
        return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;

        // 관련 데이터 먼저 삭제 후 코스 삭제
        await (prisma as any).coursePlace.deleteMany({ where: { course_id: Number(courseId) } } as any);
        await prisma.courses.delete({ where: { id: Number(courseId) } } as any);

        return NextResponse.json({ message: "Course deleted successfully" });
    } catch (error) {
        console.error("Error deleting course:", error);
        return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }
}
