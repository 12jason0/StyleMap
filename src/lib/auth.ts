import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    // 개발 환경에서는 기본 시크릿을 사용해 회원가입/로그인이 막히지 않도록 처리
    if (!secret) {
        if (process.env.NODE_ENV !== "production") {
            return "dev-insecure-jwt-secret-change-me-please";
        }
        throw new Error("JWT_SECRET environment variable is required for production");
    }
    if (process.env.NODE_ENV === "production" && secret.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters in production");
    }
    return secret;
}

export function extractBearerToken(request: NextRequest): string | null {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    return authHeader.substring(7);
}

export function verifyJwtAndGetUserId(token: string): string {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as { userId?: string };
    if (!decoded?.userId) {
        throw new Error("JWT does not contain userId");
    }
    return decoded.userId;
}

export function getUserIdFromRequest(request: NextRequest): string | null {
    try {
        const token = extractBearerToken(request);
        if (!token) return null;
        return verifyJwtAndGetUserId(token);
    } catch {
        return null;
    }
}
