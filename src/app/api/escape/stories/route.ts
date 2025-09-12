import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const client: any = prisma as any;
        if (!client.story || typeof client.story.findMany !== "function") {
            // 모델 미생성/마이그레이션 전: 빈 배열 반환
            return NextResponse.json([]);
        }
        const stories = await client.story.findMany({
            // is_active가 NULL인 레코드도 노출되도록 where 제거
            orderBy: { id: "asc" },
            include: { reward_badge: true },
        } as any);
        return NextResponse.json(
            stories.map((s: any) => ({
                id: s.id,
                title: s.title,
                synopsis: s.synopsis,
                region: s.region,
                estimated_duration_min: s.estimated_duration_min,
                price: s.price,
                reward_badge_id: s.reward_badge_id,
                is_active: s.is_active,
                badge: s.reward_badge
                    ? {
                          id: s.reward_badge.id,
                          name: s.reward_badge.name,
                          description: s.reward_badge.description,
                          image_url: s.reward_badge.image_url,
                      }
                    : null,
            }))
        );
    } catch (e: any) {
        // 테이블 미존재 등일 때도 페이지가 동작하도록 빈 배열 반환
        const msg = e?.message || String(e);
        if (msg.includes("does not exist") || msg.includes("Invalid\nprisma")) {
            return NextResponse.json([]);
        }
        console.error("escape/stories GET error", e);
        return NextResponse.json({ error: "failed" }, { status: 500 });
    }
}
