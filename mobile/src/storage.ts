import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_KEY = "authToken";

export async function saveAuthToken(token: string | null): Promise<void> {
    try {
        if (!token) {
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            return;
        }
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch {}
}

export async function loadAuthToken(): Promise<string | null> {
    try {
        const v = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        return v || null;
    } catch {
        return null;
    }
}


