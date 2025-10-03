export type AuthUser = { id: number; email: string; name: string; nickname?: string } | null;

// 서버 쿠키 기반으로 변경: 클라이언트 저장소 사용 안 함
export async function fetchSession(): Promise<{ authenticated: boolean; user: AuthUser }> {
    try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) return { authenticated: false, user: null };
        const data = await res.json();
        return { authenticated: !!data.authenticated, user: data.user ?? null };
    } catch {
        return { authenticated: false, user: null };
    }
}

export async function logout(): Promise<boolean> {
    try {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        return res.ok;
    } catch {
        return false;
    }
}
