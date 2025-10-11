import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const placeIdStr = searchParams.get("placeId");
        const placeId = Number(placeIdStr);
        if (!Number.isFinite(placeId) || placeId <= 0) {
            return NextResponse.json({ error: "Invalid placeId" }, { status: 400 });
        }

        const missions = await (prisma as any).placeMission.findMany({
            where: { placeId },
            orderBy: [{ missionNumber: "asc" }],
            take: 4,
            select: {
                id: true,
                missionNumber: true,
                missionType: true,
                missionPayload: true,
                description: true,
            },
        });

        return NextResponse.json({ missions });
    } catch (error) {
        return NextResponse.json({ error: "Failed to load missions" }, { status: 500 });
    }
}


