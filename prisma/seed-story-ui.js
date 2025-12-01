/* Minimal seed for story_ui (run: node prisma/seed-story-ui.js) */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const storyId = Number(process.env.SEED_STORY_ID || 1);
    await prisma.storyUI.upsert({
        where: { storyId },
        update: {},
        create: {
            storyId,
            engine_key: "letter",
            tokens_json: {
                colors: { npc: "#FFF1D6", user: "#B7D3F5", text: "#0F2B46" },
                radius: { bubble: 20 },
                shadow: { bubble: "0 8px 24px rgba(0,0,0,0.18)" },
            },
            flow_json: {
                intro: [
                    {
                        type: "message_group",
                        ids: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
                    },
                ],
                outro: [
                    {
                        type: "message_group",
                        ids: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
                    },
                ],
            },
            version: 1,
        },
    });
    console.log(`[seed] story_ui upserted for storyId=${storyId}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
