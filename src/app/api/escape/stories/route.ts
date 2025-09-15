import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storyId = searchParams.get("storyId");

        if (storyId) {
            const idNum = Number(storyId);
            if (!Number.isFinite(idNum)) {
                return NextResponse.json({ error: "Invalid storyId" }, { status: 400 });
            }
            const s = await prisma.story.findUnique({
                where: { id: idNum },
                include: { reward_badge: true },
            });
            if (!s || !s.is_active) {
                return NextResponse.json({ error: "Story not found" }, { status: 404 });
            }
            const normalizeLevel = (v: unknown): number => {
                if (typeof v === "number" && Number.isFinite(v)) return v;
                if (v === null || v === undefined) return 0;
                let str = String(v).trim();
                // 전각 숫자(０-９) → 반각
                str = str.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
                const n = parseInt(str, 10);
                return Number.isFinite(n) ? n : 0;
            };

            const normalized = {
                id: s.id,
                title: s.title,
                synopsis: s.synopsis ?? "",
                region: s.region ?? null,
                estimated_duration_min: s.estimated_duration_min ?? null,
                price: s.price != null ? String(s.price) : null,
                imageUrl: s.imageUrl ?? null,
                reward_badge_id: s.reward_badge_id ?? null,
                level: normalizeLevel((s as any).level),
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
            };
            return NextResponse.json(normalized);
        }

        const stories = await prisma.story.findMany({
            where: { is_active: true },
            orderBy: [{ id: "asc" }],
            include: {
                reward_badge: true,
            },
        });

        // 프론트의 타입과 맞추기 위해 프로퍼티 명 일부 변환
        const normalizeLevel = (v: unknown): number => {
            if (typeof v === "number" && Number.isFinite(v)) return v;
            if (v === null || v === undefined) return 0;
            let str = String(v).trim();
            str = str.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
            const n = parseInt(str, 10);
            return Number.isFinite(n) ? n : 0;
        };

        const normalized = stories.map((s) => ({
            id: s.id,
            title: s.title,
            synopsis: s.synopsis ?? "",
            region: s.region ?? null,
            estimated_duration_min: s.estimated_duration_min ?? null,
            price: s.price != null ? String(s.price) : null,
            imageUrl: s.imageUrl ?? null,
            reward_badge_id: s.reward_badge_id ?? null,
            level: normalizeLevel((s as any).level),
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
