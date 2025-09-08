import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error("JWT secret is not configured. Set JWT_SECRET or NEXTAUTH_SECRET.");
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

