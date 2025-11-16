import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // --- escape 전역 인증 가드: 페이지 및 API ---
    if (pathname.startsWith("/escape") || pathname.startsWith("/api/escape")) {
        const isApi = pathname.startsWith("/api/");
        const hasAuthCookie = Boolean(req.cookies.get("auth")?.value);
        if (!hasAuthCookie) {
            if (isApi) {
                return new NextResponse(
                    JSON.stringify({ error: "로그인이 필요합니다." }),
                    { status: 401, headers: { "content-type": "application/json; charset=utf-8" } }
                );
            } else {
                const url = req.nextUrl.clone();
                url.pathname = "/login";
                url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
                return NextResponse.redirect(url);
            }
        }
    }

    // --- 글로벌 차단: forest / garden (페이지 및 API) ---
    if (
        pathname.startsWith("/forest") ||
        pathname.startsWith("/garden") ||
        pathname.startsWith("/api/forest") ||
        pathname.startsWith("/api/garden")
    ) {
        // API 경로는 403 JSON 응답
        if (pathname.startsWith("/api/")) {
            return new NextResponse(
                JSON.stringify({ error: "접근이 현재 차단되었습니다." }),
                { status: 403, headers: { "content-type": "application/json; charset=utf-8" } }
            );
        }
        // 페이지는 안내 페이지로 이동
        const url = req.nextUrl.clone();
        url.pathname = "/closed";
        url.searchParams.set("reason", pathname.startsWith("/forest") ? "forest" : "garden");
        return NextResponse.rewrite(url);
    }

    // --- 기존 escape 경로 리다이렉트 유지 ---
    const match = pathname.match(/^\/escape\/(\d+)(?:\/?|$)/);
    if (match) {
        const id = match[1];
        const url = req.nextUrl.clone();
        url.pathname = "/escape/intro";
        url.searchParams.set("id", id);
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/escape/:path*",
        "/api/escape/:path*",
        "/forest/:path*",
        "/garden/:path*",
        "/api/forest/:path*",
        "/api/garden/:path*",
    ],
};


