import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID!;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/instagram/callback`;

    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&scope=user_profile,user_media&response_type=code`;

    return NextResponse.redirect(authUrl);
}
