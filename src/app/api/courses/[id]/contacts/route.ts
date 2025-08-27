import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        console.log("API: Fetching contacts for course ID:", id);

        const courseId = parseInt(id);
        if (isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            // 코스 연락처 데이터 조회 (현재는 하드코딩된 데이터 반환)
            const contacts = [
                {
                    id: 1,
                    type: "phone",
                    icon: "📞",
                    label: "전화번호",
                    value: "010-1234-5678",
                    description: "평일 09:00-18:00",
                },
                {
                    id: 2,
                    type: "kakao",
                    icon: "💬",
                    label: "카카오톡 채널",
                    value: "@stylemap",
                    description: "24시간 문의 가능",
                },
                {
                    id: 3,
                    type: "email",
                    icon: "📧",
                    label: "이메일",
                    value: "support@stylemap.com",
                    description: "24시간 내 답변",
                },
                {
                    id: 4,
                    type: "instagram",
                    icon: "📷",
                    label: "인스타그램",
                    value: "@stylemap_official",
                    description: "실시간 업데이트",
                },
                {
                    id: 5,
                    type: "website",
                    icon: "🌐",
                    label: "공식 웹사이트",
                    value: "www.stylemap.com",
                    description: "자세한 정보 확인",
                },
            ];

            console.log("API: Returning contacts for course:", courseId);
            return NextResponse.json(contacts);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching contacts:", error);
        return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
    }
}
