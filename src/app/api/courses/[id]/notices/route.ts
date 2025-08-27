import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        console.log("API: Fetching notices for course ID:", id);

        const courseId = parseInt(id);
        if (isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            // 코스 주의사항 데이터 조회 (현재는 하드코딩된 데이터 반환)
            const notices = [
                {
                    id: 1,
                    notice_text: "날씨에 따라 일정이 변경될 수 있습니다",
                    type: "일정",
                },
                {
                    id: 2,
                    notice_text: "예약 후 24시간 전까지 취소 가능합니다",
                    type: "취소",
                },
                {
                    id: 3,
                    notice_text: "안전을 위해 가이드의 안내를 따라주세요",
                    type: "안전",
                },
                {
                    id: 4,
                    notice_text: "개인 물품은 직접 관리해주세요",
                    type: "안전",
                },
                {
                    id: 5,
                    notice_text: "미성년자는 보호자 동반이 필요합니다",
                    type: "연령",
                },
                {
                    id: 6,
                    notice_text: "신체적 제약이 있는 경우 사전에 알려주세요",
                    type: "건강",
                },
            ];

            console.log("API: Returning notices for course:", courseId);
            return NextResponse.json(notices);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching notices:", error);
        return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
    }
}
