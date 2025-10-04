// src/app/api/users/bookings/route.ts

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/db";
import { getJwtSecret, getUserIdFromRequest, resolveUserId as resolveUserIdFromAuth } from "@/lib/auth"; // getUserIdFromRequest 임포트
export const dynamic = "force-dynamic";

// --- ⬇️ 수정된 부분 ⬇️ ---
// Bearer 토큰 또는 'auth' 쿠키에서 사용자 ID를 가져오는 헬퍼 함수 (위 badges API와 동일)
const resolveUserId = resolveUserIdFromAuth;
// --- ⬆️ 여기까지 수정되었습니다 ⬆️ ---

export async function GET() {
    return NextResponse.json({ bookings: [] });
}
