import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        // 실제로는 데이터베이스에서 A/B 테스트 데이터를 가져옴
        const abTests = [
            {
                id: "test-1",
                name: "AI 추천 알고리즘 개선",
                description: "개인화 가중치를 높인 새로운 알고리즘 테스트",
                status: "running",
                startDate: "2025-01-01",
                endDate: "2025-01-31",
                trafficSplit: 50,
                targetUsers: ["new_users", "active_users"],
                variants: [
                    {
                        id: "control",
                        name: "기존 알고리즘",
                        description: "현재 운영중인 추천 알고리즘",
                        weight: 50,
                        config: {
                            algorithmType: "hybrid",
                            diversityWeight: 0.3,
                            noveltyWeight: 0.2,
                            popularityBoost: 0.1,
                            personalizedWeight: 0.8,
                        },
                        results: {
                            users: 2547,
                            impressions: 45123,
                            clicks: 5234,
                            conversions: 423,
                            ctr: 11.6,
                            conversionRate: 8.1,
                            revenue: 12750000,
                        },
                    },
                    {
                        id: "variant",
                        name: "개선된 알고리즘",
                        description: "개인화 가중치 증가 + 다양성 개선",
                        weight: 50,
                        config: {
                            algorithmType: "hybrid",
                            diversityWeight: 0.4,
                            noveltyWeight: 0.3,
                            popularityBoost: 0.05,
                            personalizedWeight: 0.9,
                        },
                        results: {
                            users: 2634,
                            impressions: 46892,
                            clicks: 5891,
                            conversions: 512,
                            ctr: 12.6,
                            conversionRate: 8.7,
                            revenue: 15420000,
                        },
                    },
                ],
                metrics: [
                    { name: "CTR", type: "rate", primary: true },
                    { name: "Conversion Rate", type: "rate", primary: true },
                    { name: "Revenue per User", type: "revenue", primary: true },
                ],
            },
        ];

        return NextResponse.json(abTests);
    } catch (error) {
        console.error("Failed to fetch A/B tests:", error);
        return NextResponse.json({ error: "Failed to fetch A/B tests" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // 새로운 A/B 테스트 생성
        const newTest = {
            id: `test-${Date.now()}`,
            ...body,
            status: "draft",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // 실제로는 데이터베이스에 저장
        console.log("Creating new A/B test:", newTest);

        return NextResponse.json(newTest, { status: 201 });
    } catch (error) {
        console.error("Failed to create A/B test:", error);
        return NextResponse.json({ error: "Failed to create A/B test" }, { status: 500 });
    }
}
