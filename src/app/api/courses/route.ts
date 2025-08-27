import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        console.log("API: Starting to fetch courses from database...");
        const { searchParams } = new URL(request.url);
        const concept = searchParams.get("concept");
        console.log("API: Concept filter:", concept);

        // 데이터베이스 연결 테스트
        console.log("API: Testing database connection...");
        await prisma.$connect();
        console.log("API: Database connected successfully");

        let courses;

        if (concept) {
            // 특정 컨셉의 코스만 가져오기
            console.log("API: Fetching courses for concept:", concept);
            courses = await prisma.courses.findMany({
                where: {
                    concept: concept,
                },
            });
        } else {
            // 모든 코스 가져오기
            console.log("API: Fetching all courses...");
            courses = await prisma.courses.findMany();
        }

        console.log("API: Found courses count:", courses.length);
        console.log("API: First course sample:", courses[0]);

        // 데이터 변환
        const coursesWithRating = courses.map((course: any) => {
            return {
                id: course.id.toString(),
                title: course.title,
                description: course.description || "",
                duration: course.duration || "",
                location: course.region || "",
                price: course.price || "",
                imageUrl: course.imageUrl || "",
                concept: course.concept || "",
                rating: Number(course.rating),
                reviewCount: 0, // 임시로 0으로 설정
                participants: course.current_participants,
                creator: undefined, // 임시로 undefined로 설정
            };
        });

        console.log("API: Returning courses with rating");
        return NextResponse.json(coursesWithRating);
    } catch (error) {
        console.error("API: Error fetching courses:", error);
        console.error("API: Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : "Unknown",
        });
        return NextResponse.json(
            {
                error: "Failed to fetch courses",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, duration, location, price, imageUrl, concept, creatorId } = body;

        const course = await prisma.courses.create({
            data: {
                title,
                description,
                duration,
                region: location,
                price,
                imageUrl,
                concept,
                userId: creatorId ? parseInt(creatorId) : null,
            },
        });

        return NextResponse.json(course);
    } catch (error) {
        console.error("Error creating course:", error);
        return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
    }
}
