import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("API: Fetching course with ID:", courseId);

        const connection = await pool.getConnection();

        try {
            const [courses] = await connection.execute("SELECT * FROM courses WHERE id = ?", [courseId]);

            const coursesArray = courses as any[];

            if (coursesArray.length === 0) {
                return NextResponse.json({ error: "Course not found" }, { status: 404 });
            }

            const course = coursesArray[0];

            // 코스 상세 정보 포맷팅
            const formattedCourse = {
                id: course.id.toString(),
                title: course.title,
                description: course.description || "",
                duration: course.duration || "",
                location: course.location || "",
                price: course.price || "",
                imageUrl: course.imageUrl || "/images/default-course.jpg",
                concept: course.concept || "",
                rating: Number(course.rating) || 0,
                reviewCount: 0, // 리뷰 카운트는 별도 테이블에서 가져와야 함
                participants: course.current_participants || 0,
                maxParticipants: course.total_places || 10,
                isPopular: Boolean(course.isPopular),
                recommendedTime: course.recommended_time || "",
                season: course.season || "",
                courseType: course.course_type || "",
                transportation: course.transportation || "",
                parkingInfo: course.parking_info || "",
                reservationRequired: Boolean(course.reservation_required),
                createdAt: course.createdAt,
                updatedAt: course.updatedAt,
            };

            console.log("API: Returning course details");
            return NextResponse.json(formattedCourse);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching course:", error);
        return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        const body = await request.json();
        const { title, description, duration, location, price, imageUrl, concept, rating, current_participants } = body;

        const connection = await pool.getConnection();

        try {
            const [result] = await connection.execute(
                `UPDATE courses SET 
                title = ?, 
                description = ?, 
                duration = ?, 
                location = ?, 
                price = ?, 
                imageUrl = ?, 
                concept = ?, 
                rating = ?, 
                current_participants = ?,
                updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?`,
                [
                    title,
                    description,
                    duration,
                    location,
                    price,
                    imageUrl,
                    concept,
                    rating,
                    current_participants,
                    courseId,
                ]
            );

            return NextResponse.json({
                id: courseId,
                message: "Course updated successfully",
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error updating course:", error);
        return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;

        const connection = await pool.getConnection();

        try {
            // 관련 데이터 먼저 삭제 (외래 키 제약 조건 때문에)
            await connection.execute("DELETE FROM course_places WHERE course_id = ?", [courseId]);

            // 코스 삭제
            const [result] = await connection.execute("DELETE FROM courses WHERE id = ?", [courseId]);

            return NextResponse.json({
                message: "Course deleted successfully",
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error deleting course:", error);
        return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }
}
