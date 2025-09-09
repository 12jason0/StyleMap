import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("auth")?.value;
        if (!token) return NextResponse.json({ authenticated: false });
        const payload = jwt.decode(token) as any;
        return NextResponse.json({
            authenticated: true,
            user: { id: payload?.userId, email: payload?.email, name: payload?.name },
        });
    } catch {
        return NextResponse.json({ authenticated: false });
    }
}
