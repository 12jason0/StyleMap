import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        console.log("API: Starting to fetch courses...");

        const connection = await pool.getConnection();

        try {
            const [courses] = await connection.execute("SELECT * FROM courses ORDER BY id");
            const coursesArray = courses as any[];

            console.log("API: Found courses:", coursesArray.length);

            const formattedCourses = coursesArray.map((course) => ({
                id: course.id.toString(),
                title: course.title,
                description: course.description || "",
                duration: course.duration || "",
                location: course.region || "",
                price: course.price || "",
                imageUrl: course.imageUrl || "/images/default-course.jpg",
                concept: course.concept || "",
                rating: Number(course.rating) || 0,
                reviewCount: 0, // 리뷰 카운트는 별도 테이블에서 가져와야 함
                participants: course.current_participants || 0,
            }));

            console.log("API: Returning formatted courses");
            return NextResponse.json(formattedCourses);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching courses:", error);
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, duration, location, price, imageUrl, concept, creatorId } = body;

        const connection = await pool.getConnection();

        try {
            const [result] = await connection.execute(
                "INSERT INTO courses (title, description, duration, region, price, imageUrl, concept) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [title, description, duration, location, price, imageUrl, concept]
            );

            const insertResult = result as any;
            const courseId = insertResult.insertId;

            return NextResponse.json({
                id: courseId,
                title,
                description,
                duration,
                location,
                price,
                imageUrl,
                concept,
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error creating course:", error);
        return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
    }
}
