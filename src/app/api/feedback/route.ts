import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        return NextResponse.json([]);
    } catch (error) {
        console.error("Failed to fetch feedbacks:", error);
        return NextResponse.json({ error: "Failed to fetch feedbacks" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // 새로운 피드백 생성
        const newFeedback = {
            id: `feedback-${Date.now()}`,
            ...body,
            timestamp: new Date().toISOString(),
            tags: [],
        };

        // 실제로는 데이터베이스에 저장
        console.log("Creating new feedback:", newFeedback);

        return NextResponse.json(newFeedback, { status: 201 });
    } catch (error) {
        console.error("Failed to create feedback:", error);
        return NextResponse.json({ error: "Failed to create feedback" }, { status: 500 });
    }
}
