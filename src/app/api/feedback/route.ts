import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        // 실제로는 데이터베이스에서 피드백 데이터를 가져옴
        const feedbacks = [
            {
                id: "1",
                userId: "user1",
                courseId: "course1",
                courseName: "강남 카페 투어",
                rating: 5,
                feedbackType: "positive",
                category: "카페",
                comment: "AI가 제 취향을 정말 잘 파악했어요! 강남의 숨겨진 카페들을 많이 발견할 수 있었습니다.",
                timestamp: "2025-01-15T10:30:00Z",
                aiRecommendationId: "rec1",
                userSatisfaction: 5,
                recommendationAccuracy: 5,
                tags: ["정확한 추천", "다양한 선택지", "개인화"],
            },
            {
                id: "2",
                userId: "user2",
                courseId: "course2",
                courseName: "홍대 맛집 탐방",
                rating: 4,
                feedbackType: "positive",
                category: "맛집",
                comment: "대부분 좋았지만 몇 개는 이미 가봤던 곳이었어요. 신규성도 고려해주세요.",
                timestamp: "2025-01-15T09:15:00Z",
                aiRecommendationId: "rec2",
                userSatisfaction: 4,
                recommendationAccuracy: 3,
                tags: ["맛집 추천", "신규성 부족"],
            },
        ];

        return NextResponse.json(feedbacks);
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
            userId: "temp-user-id", // 실제로는 인증된 사용자 ID
            ...body,
            timestamp: new Date().toISOString(),
            tags: [], // 실제로는 AI가 자동으로 태그 생성
        };

        // 실제로는 데이터베이스에 저장
        console.log("Creating new feedback:", newFeedback);

        return NextResponse.json(newFeedback, { status: 201 });
    } catch (error) {
        console.error("Failed to create feedback:", error);
        return NextResponse.json({ error: "Failed to create feedback" }, { status: 500 });
    }
}
