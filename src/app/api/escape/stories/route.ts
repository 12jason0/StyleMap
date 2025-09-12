import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
    try {
        const stories = await prisma.story.findMany({
            where: { is_active: true },
            orderBy: [{ id: "asc" }],
            include: {
                reward_badge: true,
            },
        });

        // 프론트의 타입과 맞추기 위해 프로퍼티 명 일부 변환
        const normalized = stories.map((s) => ({
            id: s.id,
            title: s.title,
            synopsis: s.synopsis ?? "",
            region: s.region ?? null,
            estimated_duration_min: s.estimated_duration_min ?? null,
            price: s.price != null ? String(s.price) : null,
            reward_badge_id: s.reward_badge_id ?? null,
            is_active: s.is_active,
            created_at: s.created_at,
            updated_at: s.updated_at,
            badge: s.reward_badge
                ? {
                      id: s.reward_badge.id,
                      name: s.reward_badge.name,
                      description: s.reward_badge.description ?? "",
                      image_url: s.reward_badge.image_url ?? undefined,
                  }
                : null,
        }));

        return NextResponse.json(normalized);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
    }
}
