import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        // 실제로는 데이터베이스에서 A/B 테스트 상태를 업데이트
        console.log(`Updating A/B test ${id} status to: ${status}`);

        // 성공 응답
        return NextResponse.json({
            success: true,
            message: `A/B test status updated to ${status}`,
        });
    } catch {
        console.error("Failed to update A/B test status");
        return NextResponse.json({ error: "Failed to update A/B test status" }, { status: 500 });
    }
}
