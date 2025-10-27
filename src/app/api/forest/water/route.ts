// 📁 app/api/forest/water/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/auth";

// Next.js 라우트 캐시 방지 (보상 API는 항상 즉시 반영돼야 함)
export const dynamic = "force-dynamic";

type Source = "course" | "escape" | "admin" | "bonus";

/* -------------------------------------------------------------
🌊 물주기 보상량 결정 함수
------------------------------------------------------------- */
function getAmountBySource(source: Source | undefined, bodyAmount?: number): number {
    if (source === "course") return 3; // 코스 클리어 시 3회
    if (source === "escape") return 5; // 이스케이프 클리어 시 5회
    if (source === "admin" || source === "bonus") return Math.max(1, Number(bodyAmount || 1)); // 이벤트·운영자 지급
    return 1;
}

/* -------------------------------------------------------------
💧 POST /api/forest/water
코스 or 이스케이프 클리어 시 호출되는 성장 보상 API
------------------------------------------------------------- */
export async function POST(request: NextRequest) {
    try {
        const userId = resolveUserId(request);

        if (!userId) {
            return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
        }

        if (!Number.isFinite(userId)) {
            return NextResponse.json({ success: false, error: "BAD_USER" }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        const source = (String(body?.source || "").toLowerCase() as Source) || undefined;
        const amount = getAmountBySource(source, body?.amount);
        const meta = body?.meta && typeof body.meta === "object" ? body.meta : undefined;

        /* -------------------------------------------------------------
    🌱 1️⃣ 현재 유저의 성장 중인 나무 찾기 (없으면 첫 나무 생성)
    ------------------------------------------------------------- */
        let tree = await prisma.tree.findFirst({
            where: { userId, NOT: { status: "completed" } },
            orderBy: { createdAt: "desc" },
        });

        if (!tree) {
            // ✅ 첫 번째 나무 생성
            tree = await prisma.tree.create({
                data: { userId, status: "seedling", waterCount: 0 },
            });

            // ✅ 정원이 없으면 자동 생성
            const existingGarden = await prisma.garden.findUnique({ where: { userId } });
            if (!existingGarden) {
                const newGarden = await prisma.garden.create({
                    data: {
                        userId,
                        name: "나의 첫 정원",
                        isUnlocked: false,
                    },
                });

                // 🌿 기본 배치 (정원 시작점)
                const STARTER_LAYOUT = [
                    { posX: 0, posZ: 0, scale: 1 },
                    { posX: 2, posZ: 1, scale: 1 },
                    { posX: -2, posZ: -1, scale: 1 },
                ];

                try {
                    await prisma.gardenTree.createMany({
                        data: STARTER_LAYOUT.map((item) => ({
                            gardenId: newGarden.id,
                            posX: item.posX,
                            posZ: item.posZ,
                            scale: item.scale,
                            treeId: null,
                        })) as any,
                    });
                } catch (e) {
                    // 초기 시드 실패는 치명적이지 않으므로 무시 (타입/마이그레이션 지연 대비)
                    console.warn("gardenTree seed skipped", e);
                }

                console.log("✅ 첫 나무 생성 → 기본 정원 자동 생성 완료");
            }
        }

        /* -------------------------------------------------------------
    💧 2️⃣ 물주기 진행 및 로그 기록
    ------------------------------------------------------------- */
        const REQUIRED = 15; // 완성까지 필요한 물의 양
        const nextCount = (tree.waterCount as number) + amount;
        const willComplete = nextCount >= REQUIRED;

        const result = await prisma.$transaction(async (tx) => {
            // 💧 물주기 로그 기록
            await tx.waterLog.create({
                data: {
                    userId,
                    treeId: tree!.id,
                    amount,
                    source: (source || "admin") as any,
                    meta: meta || undefined,
                },
            });

            // 🌱 트리 업데이트 (성장 or 완성)
            const updatedTree = await tx.tree.update({
                where: { id: tree!.id },
                data: {
                    waterCount: nextCount,
                    status: willComplete ? ("completed" as any) : ("growing" as any),
                    completedAt: willComplete ? new Date() : undefined,
                },
            });

            /* -------------------------------------------------------------
      🌳 3️⃣ 나무 완성 시 정원 언락 + 새 나무 자동 생성
      ------------------------------------------------------------- */
            if (willComplete) {
                const garden = await tx.garden.findUnique({ where: { userId } });

                if (!garden) {
                    await tx.garden.create({
                        data: { userId, isUnlocked: true, openedAt: new Date() },
                    });
                    console.log("🌳 첫 정원 생성 및 언락 완료");
                } else if (!garden.isUnlocked) {
                    await tx.garden.update({
                        where: { userId },
                        data: { isUnlocked: true, openedAt: new Date() },
                    });
                    console.log("🌳 기존 정원 언락 완료");
                }

                // 🌲 새 나무 자동 생성 (다음 사이클 시작)
                await tx.tree.create({
                    data: { userId, status: "seedling", waterCount: 0 },
                });
            }

            return updatedTree;
        });

        /* -------------------------------------------------------------
    🌺 4️⃣ 응답 데이터
    ------------------------------------------------------------- */
        return NextResponse.json({
            success: true,
            source,
            amount,
            required: REQUIRED,
            waterCount: Math.min(result.waterCount, REQUIRED),
            completed: result.status === "completed",
            tree: result,
            message:
                result.status === "completed"
                    ? "🌳 나무가 완성되었습니다! 하늘 정원이 열립니다!"
                    : `💧 물주기 +${amount} (${Math.min(result.waterCount, REQUIRED)}/${REQUIRED})`,
        });
    } catch (e) {
        console.error("🚨 /api/forest/water error:", e);
        return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
    }
}
