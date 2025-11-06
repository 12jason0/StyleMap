import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sendPushNotificationToAll, sendPushNotificationToEveryone } from "@/lib/push-notifications";

export async function POST(req: Request) {
    try {
        // ✅ 1. 관리자 인증 확인
        const jar = await cookies();
        const cookie = jar.get("admin_auth");
        const isAdmin = cookie?.value === "true";

        if (!isAdmin) {
            return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
        }

        // ✅ 2. 요청 데이터 받기
        const { title, body, imageUrl, screen, url, target } = await req.json();

        if (!title || !body) {
            return NextResponse.json({ error: "제목과 내용을 입력해주세요." }, { status: 400 });
        }

        // ✅ 3. 푸시 발송 (이미지 포함)
        const payload = {
            imageUrl: imageUrl || "",
            screen,
            url,
        } as any;

        const useAll = String(target || "all") === "all";
        const result = useAll
            ? await sendPushNotificationToEveryone(title, body, payload)
            : await sendPushNotificationToAll(title, body, payload);

        return NextResponse.json({
            success: true,
            sent: result.sent,
            message: `총 ${result.sent}명에게 알림 전송 완료`,
        });
    } catch (err) {
        console.error("❌ 알림 전송 실패:", err);
        return NextResponse.json({ error: "서버 오류로 알림 전송 실패" }, { status: 500 });
    }
}
