import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
    try {
        // Prisma 연결 및 간단 쿼리
        const test = await (prisma as any).$queryRaw`SELECT 1 as test`;
        const userCount = await (prisma as any).user.count();

        return NextResponse.json({
            success: true,
            message: "데이터베이스 연결 성공",
            test,
            userCount,
        });
    } catch (error) {
        console.error("데이터베이스 연결 오류:", error);
        return NextResponse.json(
            {
                error: "데이터베이스 연결 실패",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
