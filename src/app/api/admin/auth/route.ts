import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "admin_auth";
const COOKIE_TTL_SEC = 60 * 60 * 12; // 12h

function isAuthenticated(): boolean {
    const jar = cookies();
    const cookie = jar.get(COOKIE_NAME);
    return cookie?.value === "true";
}

export async function GET() {
    const ok = isAuthenticated();
    return NextResponse.json({ authenticated: ok });
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const password = String(body?.password || "");
    const expected = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "";

    if (!expected) {
        return NextResponse.json({ error: "Server password not configured" }, { status: 500 });
    }

    if (password !== expected) {
        return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
        name: COOKIE_NAME,
        value: "true",
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_TTL_SEC,
    });
    return res;
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ name: COOKIE_NAME, value: "", maxAge: 0, path: "/" });
    return res;
}
