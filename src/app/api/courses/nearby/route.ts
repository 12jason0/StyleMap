import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lat = parseFloat(searchParams.get("lat") || "");
        const lng = parseFloat(searchParams.get("lng") || "");
        const radius = parseFloat(searchParams.get("radius") || "5");

        if (isNaN(lat) || isNaN(lng)) {
            return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
        }

        const places = await prisma.place.findMany({
            where: {
                latitude: { gte: lat - radius * 0.01, lte: lat + radius * 0.01 },
                longitude: { gte: lng - radius * 0.01, lte: lng + radius * 0.01 },
            },
            select: { id: true },
        });

        if (places.length === 0) {
            return NextResponse.json([]);
        }

        const placeIds = places.map((p) => p.id);

        // ✅ [수정됨] prisma.courses -> prisma.course
        const courses = await prisma.course.findMany({
            where: {
                coursePlaces: { some: { place_id: { in: placeIds } } },
            },
            include: { coursePlaces: { include: { place: true } } },
        });

        return NextResponse.json(courses);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch nearby courses" }, { status: 500 });
    }
}
