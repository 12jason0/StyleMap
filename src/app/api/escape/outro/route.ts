import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storyId = Number(searchParams.get("storyId"));
        if (!Number.isFinite(storyId)) {
            // [수정] 반환 형식을 { messages: [] }로 통일
            return NextResponse.json({ messages: [] });
        }

        // [수정] 주석에 맞게 category 필터 추가
        const endingCategories = ["outro", "ending", "epilogue"];
        const placeOptions = await prisma.placeOption.findMany({
            where: {
                storyId,
                category: {
                    in: endingCategories, // 'outro', 'ending', 'epilogue' 중 하나
                },
            },
            select: {
                id: true,
                category: true,
                stories: {
                    orderBy: { order: "asc" },
                    select: { dialogue: true, narration: true, speaker: true },
                },
            },
        });

        // [수정] placeOptions에서 'stories' 배열들을 하나로 합침
        // placeOptions가 [ { stories: [...] }, { stories: [...] } ] 형태이므로 flatMap을 사용
        const allDialogues = placeOptions.flatMap((option) => option.stories);

        // [수정] 'dialogues' 대신 'allDialogues' 변수 사용
        const messages = (allDialogues || [])
            .map((d: any) => ({
                // [수정] select한 필드(dialogue, narration)를 사용
                text: String(d?.dialogue || d?.narration || "").trim(),
                // [수정] 'role'은 select하지 않았으므로 undefined 또는 d.speaker를 사용
                role: undefined,
                speaker: d?.speaker ? String(d.speaker) : undefined,
            }))
            .filter((m: any) => m.text.length > 0);

        return NextResponse.json({ messages });
    } catch (e: any) {
        // [수정] 반환 형식을 { messages: [] }로 통일
        return NextResponse.json({ messages: [] });
    }
}
