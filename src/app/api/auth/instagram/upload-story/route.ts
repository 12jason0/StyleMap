import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get("instagram_token")?.value;
        const userId = request.cookies.get("instagram_user_id")?.value;

        if (!token) {
            return NextResponse.json({ error: "Instagram 로그인이 필요합니다", needAuth: true }, { status: 401 });
        }

        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: "이미지 URL이 필요합니다" }, { status: 400 });
        }

        // ✅ 이미지 URL이 공개 접근 가능한지 확인
        const publicUrl = imageUrl.startsWith("http") ? imageUrl : `${process.env.NEXT_PUBLIC_BASE_URL}${imageUrl}`;

        console.log("📸 Instagram Story 업로드 시작:", { publicUrl, userId });

        // 1단계: 미디어 컨테이너 생성
        const containerUrl = userId
            ? `https://graph.instagram.com/${userId}/media`
            : `https://graph.instagram.com/me/media`;

        const containerResponse = await fetch(
            `${containerUrl}?image_url=${encodeURIComponent(publicUrl)}&media_type=STORIES&access_token=${token}`,
            { method: "POST" }
        );

        const containerData = await containerResponse.json();

        if (!containerResponse.ok) {
            console.error("컨테이너 생성 실패:", containerData);
            throw new Error(containerData.error?.message || "미디어 컨테이너 생성 실패");
        }

        console.log("✅ 컨테이너 생성 완료:", containerData.id);

        // 2단계: 스토리 게시
        const publishUrl = userId
            ? `https://graph.instagram.com/${userId}/media_publish`
            : `https://graph.instagram.com/me/media_publish`;

        const publishResponse = await fetch(`${publishUrl}?creation_id=${containerData.id}&access_token=${token}`, {
            method: "POST",
        });

        const publishData = await publishResponse.json();

        if (!publishResponse.ok) {
            console.error("게시 실패:", publishData);
            throw new Error(publishData.error?.message || "스토리 게시 실패");
        }

        console.log("✅ 스토리 게시 완료:", publishData.id);

        return NextResponse.json({
            success: true,
            id: publishData.id,
            message: "Instagram 스토리에 업로드되었습니다!",
        });
    } catch (error: any) {
        console.error("Instagram upload error:", error);
        return NextResponse.json({ error: error.message || "업로드 중 오류 발생" }, { status: 500 });
    }
}
