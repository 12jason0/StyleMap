import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const userIdStr = getUserIdFromRequest(request);
        if (!userIdStr) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        const userId = Number(userIdStr);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                profileImageUrl: true,
                createdAt: true,
                mbti: true,
                age: true,
            },
        });
        if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.username,
                profileImage: user.profileImageUrl,
                createdAt: user.createdAt,
                mbti: user.mbti,
                age: user.age,
            },
        });
    } catch (e) {
        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const userIdStr = getUserIdFromRequest(request);
        if (!userIdStr) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        const userId = Number(userIdStr);

        const body = await request.json().catch(() => null);
        if (!body) return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });

        const name = typeof body.name === "string" ? body.name.trim() : undefined;
        const email = typeof body.email === "string" ? body.email.trim() : undefined;
        const mbti = typeof body.mbti === "string" ? body.mbti.trim() : undefined;
        const age =
            body.age !== undefined && body.age !== null && String(body.age).trim() !== ""
                ? Number.parseInt(String(body.age), 10)
                : null;

        if (age !== null && (!Number.isFinite(age) || age < 0)) {
            return NextResponse.json({ error: "INVALID_AGE" }, { status: 400 });
        }

        const data: any = {};
        if (name !== undefined) data.username = name;
        if (email !== undefined) data.email = email || null;
        if (mbti !== undefined) data.mbti = mbti || null;
        if (age !== undefined) data.age = age;

        const updated = await prisma.user.update({ where: { id: userId }, data });
        return NextResponse.json({
            success: true,
            user: {
                id: updated.id,
                email: updated.email,
                name: updated.username,
                mbti: updated.mbti,
                age: updated.age,
                createdAt: updated.createdAt,
                profileImage: updated.profileImageUrl || null,
            },
        });
    } catch (e: any) {
        const msg = typeof e?.message === "string" ? e.message : "SERVER_ERROR";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
