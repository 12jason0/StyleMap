import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id: courseId } = params;
        console.log("API: Fetching course with ID:", courseId);
        console.log("API: Course ID type:", typeof courseId);
        console.log("API: Request URL:", request.url);

        const connection = await pool.getConnection();

        try {
            // 코스 기본 정보와 장소 수를 한 번에 가져오기
            const [courses] = await connection.execute(
                `
                SELECT c.*, 
                       (SELECT COUNT(*) FROM course_places WHERE course_id = c.id) as place_count
                FROM courses c 
                WHERE c.id = ?
            `,
                [courseId]
            );
            console.log("API: SQL query executed with courseId:", courseId);
            console.log("API: Raw database result:", courses);
            const coursesArray = courses as Array<{
                id: number;
                title: string;
                description: string;
                duration: string;
                region: string;
                price: string;
                imageUrl: string;
                concept: string;
                rating: number;
                current_participants: number;
                max_participants: number;
                place_count: number;
                created_at: string;
                updated_at: string;
            }>;

            if (coursesArray.length === 0) {
                return NextResponse.json({ error: "Course not found" }, { status: 404 });
            }

            const course = coursesArray[0];
            console.log("API: Selected course:", course);

            // 코스 상세 정보 포맷팅 (실제 데이터베이스 스키마에 맞춤)
            const formattedCourse = {
                id: course.id.toString(),
                title: course.title || "",
                description: course.description || "",
                duration: course.duration || "",
                location: course.region || "", // region 필드를 location으로 매핑
                price: course.price || "",
                imageUrl: course.imageUrl || "/images/default-course.jpg",
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
                placeCount: course.place_count || 0,
                createdAt: course.created_at,
                updatedAt: course.updated_at,
            };

            console.log("API: Returning formatted course:", formattedCourse);
            return NextResponse.json(formattedCourse);
        } finally {
            connection.release();
        }
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

        const connection = await pool.getConnection();

        try {
            await connection.execute(
                `UPDATE courses SET 
                title = ?, 
                description = ?, 
                duration = ?, 
                region = ?, 
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
            await connection.execute("DELETE FROM courses WHERE id = ?", [courseId]);

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
