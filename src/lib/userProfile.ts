import prisma from "@/lib/db";

type ConceptPreference = {
    concept: string;
    score: number;
};

/**
 * 최근 기간의 사용자 상호작용을 가중 합산해 선호 concept을 계산합니다.
 * - 기간: 최근 30일
 * - 가중치: view 1, click 1.5, like 3, share 2, time_spent 0.001
 * - 반환: 상위 N개의 concept 문자열 배열
 */
export async function getUserPreferences(userId: number, topN: number = 3): Promise<string[]> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 상호작용 + 코스 concept 조인 조회
    const interactions = await prisma.userInteraction.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { action: true, createdAt: true, course: { select: { concept: true } } },
    });

    // 가중치 정의
    const weight: Record<string, number> = {
        view: 1,
        click: 1.5,
        like: 3,
        share: 2,
        time_spent: 0.001,
    };

    const conceptToScore = new Map<string, number>();

    for (const it of interactions) {
        const concept = it.course?.concept || "misc";
        const w = weight[it.action] ?? 1;
        conceptToScore.set(concept, (conceptToScore.get(concept) || 0) + w);
    }

    const ranked: ConceptPreference[] = [...conceptToScore.entries()]
        .map(([concept, score]) => ({ concept, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, topN));

    return ranked.map((r) => r.concept);
}

/**
 * 사용자 선호 concept 세트를 반환합니다. 정렬 가산점 계산 시 세트가 편리합니다.
 */
export async function getUserPreferenceSet(userId: number, topN: number = 5): Promise<Set<string>> {
    const prefs = await getUserPreferences(userId, topN);
    return new Set(prefs.filter(Boolean));
}
