import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await params;
        console.log("API: Fetching places for course ID:", courseId);
        console.log("API: Course ID type:", typeof courseId);
        console.log("API: Request URL:", request.url);

        const cps = await (prisma as any).coursePlace.findMany({
            where: { course_id: Number(courseId) },
            orderBy: [{ order_index: "asc" }],
            include: {
                places: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        description: true,
                        category: true,
                        avg_cost_range: true,
                        opening_hours: true,
                        phone: true,
                        website: true,
                        parking_available: true,
                        reservation_required: true,
                        latitude: true,
                        longitude: true,
                        imageUrl: true,
                    },
                },
            },
        });

        const formatted = cps.map((cp: any) => ({
            id: cp.id,
            course_id: cp.course_id,
            place_id: cp.place_id,
            order_index: cp.order_index,
            estimated_duration: cp.estimated_duration,
            recommended_time: cp.recommended_time,
            notes: cp.notes,
            place: {
                id: cp.place_id,
                name: cp.places?.name ?? "",
                address: cp.places?.address ?? "",
                description: cp.places?.description ?? "",
                category: cp.places?.category ?? "",
                avg_cost_range: cp.places?.avg_cost_range ?? "",
                opening_hours: cp.places?.opening_hours ?? "",
                phone: cp.places?.phone ?? "",
                website: cp.places?.website ?? "",
                parking_available: Boolean(cp.places?.parking_available),
                reservation_required: Boolean(cp.places?.reservation_required),
                latitude: Number(cp.places?.latitude),
                longitude: Number(cp.places?.longitude),
                image_url: cp.places?.imageUrl ?? "",
            },
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error("API: Error fetching course places:", error);
        console.error("API: Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : "No stack trace",
        });
        return NextResponse.json(
            {
                error: "Failed to fetch course places",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = resolveUserId(request);
        if (!userId) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const { id: courseIdParam } = await params;
        const course_id = Number(courseIdParam);
        const body = await request.json();
        const { place_id, order_index, estimated_duration, recommended_time, notes } = body || {};

        if (!course_id || !place_id || !order_index) {
            return NextResponse.json({ error: "course_id, place_id, order_index는 필수입니다." }, { status: 400 });
        }

        // 생성
        const created = await (prisma as any).coursePlace.create({
            data: {
                course_id,
                place_id: Number(place_id),
                order_index: Number(order_index),
                estimated_duration: typeof estimated_duration === "number" ? estimated_duration : null,
                recommended_time: recommended_time || null,
                notes: notes || null,
            },
        });

        return NextResponse.json({ success: true, course_place: created }, { status: 201 });
    } catch (error) {
        console.error("API: 코스-장소 연결 생성 오류:", error);
        return NextResponse.json({ error: "코스-장소 연결 생성 실패" }, { status: 500 });
    }
}
