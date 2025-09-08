export type AuthUser = unknown;

export function saveAuthSession(token: string, user?: AuthUser): void {
    try {
        localStorage.setItem("authToken", token);
        if (user !== undefined) {
            localStorage.setItem("user", JSON.stringify(user));
        }
        // 선택: 로그인 시간 저장 (통계/로깅 용도)
        localStorage.setItem("loginTime", Date.now().toString());
    } catch {}
}

export function clearAuthSession(): void {
    try {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        localStorage.removeItem("loginTime");
    } catch {}
}

export function dispatchAuthChange(token?: string): void {
    try {
        const event = new CustomEvent("authTokenChange", { detail: { token } });
        window.dispatchEvent(event);
    } catch {}
}

export function getStoredToken(): string | null {
    try {
        return localStorage.getItem("authToken");
    } catch {
        return null;
    }
}

