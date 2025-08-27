import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        console.log("API: Fetching course with ID:", id);

        const courseId = parseInt(id);

        if (isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        console.log("API: Parsed course ID:", courseId);

        const connection = await pool.getConnection();

        try {
            const [courses] = await connection.execute("SELECT * FROM courses WHERE id = ?", [courseId]);

            const coursesArray = courses as any[];
            console.log("API: Found courses:", coursesArray);

            if (coursesArray.length === 0) {
                return NextResponse.json({ error: "Course not found" }, { status: 404 });
            }

            const course = coursesArray[0];

            const courseData = {
                id: course.id.toString(),
                title: course.title,
                description: course.description || "",
                duration: course.duration || "",
                location: course.region || "",
                price: course.price || "",
                imageUrl: course.imageUrl || "",
                concept: course.concept || "",
                rating: Number(course.rating) || 0,
                participants: course.current_participants || 0,
                maxParticipants: course.max_participants || 0,
                isPopular: course.isPopular || false,
                createdAt: course.createdAt,
                updatedAt: course.updatedAt,
            };

            console.log("API: Returning course data:", courseData);
            return NextResponse.json(courseData);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching course:", error);
        console.error("API: Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
    }
}
