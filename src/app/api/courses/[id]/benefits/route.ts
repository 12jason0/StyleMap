import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        console.log("API: Fetching benefits for course ID:", id);

        const courseId = parseInt(id);
        if (isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            // 실제 데이터베이스에서 코스 혜택 데이터 조회
            const [benefits] = await connection.execute(
                "SELECT id, benefit_text, is_included, display_order FROM course_benefits WHERE course_id = ? AND is_included = 1 ORDER BY display_order",
                [courseId]
            );

            const benefitsArray = benefits as any[];
            console.log("API: Found benefits:", benefitsArray.length);

            const formattedBenefits = benefitsArray.map((benefit) => ({
                id: benefit.id,
                benefit_text: benefit.benefit_text,
                category: "혜택", // 기본 카테고리
                display_order: benefit.display_order,
            }));

            console.log("API: Returning benefits for course:", courseId);
            return NextResponse.json(formattedBenefits);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("API: Error fetching benefits:", error);
        return NextResponse.json({ error: "Failed to fetch benefits" }, { status: 500 });
    }
}
