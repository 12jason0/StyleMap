// src/app/api/users/bookings/route.ts

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/db";
import { getJwtSecret, getUserIdFromRequest } from "@/lib/auth"; // getUserIdFromRequest 임포트
export const dynamic = "force-dynamic";

// --- ⬇️ 수정된 부분 ⬇️ ---
// Bearer 토큰 또는 'auth' 쿠키에서 사용자 ID를 가져오는 헬퍼 함수 (위 badges API와 동일)
function resolveUserId(request: NextRequest): number | null {
    const fromHeader = getUserIdFromRequest(request);
    if (fromHeader && Number.isFinite(Number(fromHeader))) {
        return Number(fromHeader);
    }
    const token = request.cookies.get("auth")?.value;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, getJwtSecret()) as { userId?: number | string };
        if (payload?.userId) return Number(payload.userId);
    } catch {}
    return null;
}
// --- ⬆️ 여기까지 수정되었습니다 ⬆️ ---

export async function GET() {
    return NextResponse.json({ bookings: [] });
}
