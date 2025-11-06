import { WEB_BASE } from "../config";

export async function registerPushToken(userId: number, pushToken: string): Promise<boolean> {
    try {
        console.log("푸시 토큰 등록 시작:", { userId, pushToken });

        const response = await fetch(`${WEB_BASE}/api/push/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId,
                pushToken,
                platform: "expo",
            }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log("푸시 토큰 등록 성공:", data);
            return true;
        } else {
            console.error("푸시 토큰 등록 실패:", data);
            return false;
        }
    } catch (error) {
        console.error("푸시 토큰 등록 오류:", error);
        return false;
    }
}
