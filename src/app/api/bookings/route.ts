import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const courseId = searchParams.get("courseId");

        let bookings;

        if (userId) {
            // 특정 사용자의 예약만 가져오기
            bookings = await prisma.booking.findMany({
                where: { userId: parseInt(userId) },
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            imageUrl: true,
                            concept: true,
                        },
                    },
                },
            });
        } else if (courseId) {
            // 특정 코스의 예약만 가져오기
            bookings = await prisma.booking.findMany({
                where: { courseId: parseInt(courseId) },
                include: {
                    user: {
                        select: {
                            id: true,
                            nickname: true,
                            email: true,
                        },
                    },
                },
            });
        } else {
            // 모든 예약 가져오기
            bookings = await prisma.booking.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            nickname: true,
                            email: true,
                        },
                    },
                    course: {
                        select: {
                            id: true,
                            title: true,
                            imageUrl: true,
                            concept: true,
                        },
                    },
                },
            });
        }

        return NextResponse.json(bookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, courseId } = body;

        // 중복 예약 확인
        const existingBooking = await prisma.booking.findFirst({
            where: {
                userId: parseInt(userId),
                courseId: parseInt(courseId),
                status: {
                    in: ["pending", "confirmed"],
                },
            },
        });

        if (existingBooking) {
            return NextResponse.json({ error: "Booking already exists" }, { status: 400 });
        }

        const booking = await prisma.booking.create({
            data: {
                userId: parseInt(userId),
                courseId: parseInt(courseId),
                status: "pending",
            },
            include: {
                user: {
                    select: {
                        id: true,
                        nickname: true,
                        email: true,
                    },
                },
                course: {
                    select: {
                        id: true,
                        title: true,
                        imageUrl: true,
                        concept: true,
                    },
                },
            },
        });

        // 코스 참가자 수 증가
        await prisma.courses.update({
            where: { id: parseInt(courseId) },
            data: {
                current_participants: {
                    increment: 1,
                },
            },
        });

        return NextResponse.json(booking);
    } catch (error) {
        console.error("Error creating booking:", error);
        return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
}
