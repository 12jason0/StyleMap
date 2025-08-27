import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        console.log("API: Fetching highlights for course ID:", id);

        const courseId = parseInt(id);
        if (isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            // 코스 특징 데이터 조회 (현재는 하드코딩된 데이터 반환)
            const highlights = [
                {
                    id: 1,
                    icon: "🌟",
                    title: "전문 가이드와 함께하는 특별한 경험",
                    description: "현지 전문가의 상세한 설명과 안내",
                },
                {
                    id: 2,
                    icon: "📸",
                    title: "인스타그램 스팟에서 멋진 사진 촬영",
                    description: "SNS에 올릴 수 있는 완벽한 사진 촬영",
                },
                {
                    id: 3,
                    icon: "🎯",
                    title: "개인 맞춤형 일정 조율 가능",
                    description: "개인 취향에 맞는 유연한 일정 조정",
                },
                {
                    id: 4,
                    icon: "🚀",
                    title: "빠른 예약 및 결제 시스템",
                    description: "간편하고 안전한 온라인 예약",
                },
            ];

            console.log("API: Returning highlights for course:", courseId);
            return NextResponse.json(highlights);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching highlights:", error);
        return NextResponse.json({ error: "Failed to fetch highlights" }, { status: 500 });
    }
}
