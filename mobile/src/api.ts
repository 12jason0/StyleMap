import { Platform } from "react-native";
import { WEB_BASE } from "./config";
import { loadAuthToken } from "./storage";

export async function registerPushTokenToServer(token: string | null): Promise<void> {
    if (!token) return;
    try {
        const authToken = await loadAuthToken();
        await fetch(`${WEB_BASE}/api/notifications`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ token, platform: Platform.OS }),
        }).catch(() => {});
    } catch {}
}


