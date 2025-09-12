/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function ensureBadge(name, description, image_url) {
    const existing = await prisma.badges.findFirst({ where: { name } }).catch(() => null);
    if (existing) return existing;
    return prisma.badges.create({ data: { name, description, image_url } });
}

async function ensureStory(title, data) {
    const existing = await prisma.stories.findFirst({ where: { title } }).catch(() => null);
    if (existing) return existing;
    return prisma.stories.create({ data: { title, ...data } });
}

async function upsertChapter(story_id, chapter_number, data) {
    try {
        // Composite unique on (story_id, chapter_number)
        return await prisma.storychapters.upsert({
            where: { story_id_chapter_number: { story_id, chapter_number } },
            update: data,
            create: { story_id, chapter_number, ...data },
        });
    } catch (e) {
        // Fallback for environments without the composite unique (older migration):
        const found = await prisma.storychapters.findFirst({ where: { story_id, chapter_number } });
        if (found) {
            return prisma.storychapters.update({ where: { id: found.id }, data });
        }
        return prisma.storychapters.create({ data: { story_id, chapter_number, ...data } });
    }
}

async function main() {
    console.log("Seeding Escape data...");

    // Badges
    const badgeBeginner = await ensureBadge("초심자의 행운", "첫 스토리를 완료했어요!", "/images/maker1.png");
    const badgeExplorer = await ensureBadge("도심 탐험가", "도심 미션을 모두 완료했어요!", "/images/maker.png");

    // Stories
    const seoulNight = await ensureStory("서울 야간 탈출", {
        synopsis: "도심 속 숨은 단서들을 찾아 탈출하세요!",
        region: "서울",
        estimated_duration_min: 90,
        price: "무료",
        reward_badge_id: badgeBeginner.id,
        is_active: true,
    });

    const seongsu = await ensureStory("성수 감성 미션", {
        synopsis: "카페 골목 곳곳의 수수께끼를 풀어보세요.",
        region: "성수",
        estimated_duration_min: 75,
        price: "무료",
        reward_badge_id: badgeExplorer.id,
        is_active: true,
    });

    // Chapters for seoulNight
    await upsertChapter(seoulNight.id, 1, {
        title: "광장에 숨은 숫자",
        location_name: "서울광장",
        address: "서울 중구 세종대로 110",
        story_text: "광장 주변을 둘러보고, 분수대 근처에 적힌 숫자를 찾아보세요.",
        mission_type: "quiz",
        mission_payload: { question: "분수대 안내판의 마지막 숫자는?", answer: "7" },
    });

    await upsertChapter(seoulNight.id, 2, {
        title: "청계천 방향",
        location_name: "청계천 광통교",
        address: "서울 종로구 청계천로",
        story_text: "다리 난간의 방향표시를 확인하세요.",
        mission_type: "location",
        mission_payload: { hint: "동쪽(EAST) 방향" },
    });

    await upsertChapter(seoulNight.id, 3, {
        title: "마지막 퍼즐",
        story_text: "도심의 불빛을 떠올리며 단어를 완성하세요.",
        mission_type: "quiz",
        mission_payload: { question: "N _ O N", answer: "NEON" },
        puzzle_text: "N?ON",
    });

    // Chapters for seongsu
    await upsertChapter(seongsu.id, 1, {
        title: "성수동 입구",
        location_name: "성수역 3번 출구",
        story_text: "출구 앞 조형물의 색깔은?",
        mission_type: "quiz",
        mission_payload: { question: "조형물의 주된 색상은?", answer: "RED" },
    });

    await upsertChapter(seongsu.id, 2, {
        title: "카페 골목",
        location_name: "성수 카페거리",
        story_text: "간판에 숨은 별 모양을 찾아보세요.",
        mission_type: "photo",
        mission_payload: { tip: "별이 보이는 간판을 촬영해보세요." },
    });

    console.log("Seed completed.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
