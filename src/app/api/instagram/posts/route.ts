import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const username = (searchParams.get("username") || "").trim() || "hwa.ngaeng";
        const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || 12), 50));
        if (!username) {
            return NextResponse.json({ success: false, error: "username is required" }, { status: 400 });
        }

        const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
        const headers: Record<string, string> = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            Accept: "application/json, text/plain, */*",
        };
        const sessionId = process.env.INSTAGRAM_SESSION_ID;
        if (sessionId) headers["cookie"] = `sessionid=${sessionId}`;

        const res = await fetch(url, { headers: headers as any, cache: "no-store" });
        if (!res.ok) {
            return NextResponse.json(
                { success: false, error: `instagram fetch failed (${res.status})` },
                { status: 502 }
            );
        }

        const json = await res.json();
        const user = json?.data?.user;
        const edges = user?.edge_owner_to_timeline_media?.edges || [];

        const posts = edges
            .map((e: any) => e?.node)
            .filter(
                (n: any) =>
                    n &&
                    !String(n?.product_type || "")
                        .toLowerCase()
                        .includes("clips")
            )
            .map((n: any) => ({
                id: n.id,
                shortcode: n.shortcode,
                title: n?.edge_media_to_caption?.edges?.[0]?.node?.text || "",
                url: `https://www.instagram.com/p/${n.shortcode}/`,
                thumbnail: n.thumbnail_src || n.display_url,
                isVideo: !!n.is_video,
                taken_at_timestamp: n.taken_at_timestamp,
            }))
            .slice(0, limit);

        return NextResponse.json({ success: true, username, posts });
    } catch (e) {
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
