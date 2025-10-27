import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const userId = resolveUserId(request);
        if (!userId) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
        const body = await request.json().catch(() => ({}));
        const treeId = Number(body?.treeId);
        const posX = Number(body?.posX ?? 0);
        const posY = Number(body?.posY ?? 0);
        const posZ = Number(body?.posZ ?? 0);
        const rotX = Number(body?.rotX ?? 0);
        const rotY = Number(body?.rotY ?? 0);
        const rotZ = Number(body?.rotZ ?? 0);
        const scale = Number(body?.scale ?? 1);
        if (!Number.isFinite(treeId)) return NextResponse.json({ success: false, error: "BAD_TREE" }, { status: 400 });

        const tree = await (prisma as any).tree.findUnique({ where: { id: treeId } });
        if (!tree || tree.userId !== userId)
            return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
        if (tree.status !== "completed")
            return NextResponse.json({ success: false, error: "NOT_COMPLETED" }, { status: 400 });

        const garden = await (prisma as any).garden.upsert({
            where: { userId },
            create: { userId, isUnlocked: true, openedAt: new Date() },
            update: {},
        });

        const placed = await (prisma as any).gardenTree.create({
            data: { gardenId: garden.id, treeId, posX, posY, posZ, rotX, rotY, rotZ, scale },
        });
        return NextResponse.json({ success: true, placed });
    } catch (e) {
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}
