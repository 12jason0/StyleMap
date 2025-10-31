import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("image") as File | null;
        if (!file) {
            return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const filename = `escape-${Date.now()}.png`;
        const relPath = join("public", "uploads", "escapes", filename);
        const absPath = join(process.cwd(), relPath);

        // 디렉터리 보장
        await mkdir(dirname(absPath), { recursive: true });
        await writeFile(absPath, buffer);

        // 베이스 URL 계산 (환경변수 → 요청 기준 오리진)
        const baseFromEnv = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
        const origin = baseFromEnv || new URL(request.url).origin;
        const imageUrl = `${origin}/uploads/escapes/${filename}`;

        return NextResponse.json({ success: true, imageUrl });
    } catch (error) {
        console.error("이미지 업로드 실패:", error);
        return NextResponse.json({ error: "이미지 업로드에 실패했습니다." }, { status: 500 });
    }
}
