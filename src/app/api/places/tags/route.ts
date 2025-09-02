import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// places.tags 컬럼에서 태그 목록을 수집해 unique로 반환
// tags 컬럼이 없거나 비어있으면 category를 fallback으로 사용
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const region = (searchParams.get("region") || "").trim();
    let connection;
    try {
        connection = await pool.getConnection();
        // 테이블에 tags 컬럼이 없을 수 있어 category/name 기반으로 태그 추출 (지역 필터 지원)
        let sql = "SELECT category, name, address FROM places";
        const params: any[] = [];
        if (region) {
            sql += " WHERE address LIKE ?";
            params.push(`%${region}%`);
        }
        const [rows] = await connection.execute(sql, params);

        type Row = { category?: string | null; name?: string | null; address?: string | null };
        const tagCountMap = new Map<string, number>();

        const pushTag = (t: string) => {
            const tag = t.trim();
            if (!tag) return;
            const key = tag.toLowerCase();
            tagCountMap.set(key, (tagCountMap.get(key) || 0) + 1);
        };

        (rows as Row[]).forEach((r) => {
            const rawCategory = r.category ?? "";
            const rawName = r.name ?? "";

            // category 우선, 없으면 name에서 키워드 추출
            const tokens = (rawCategory || rawName)
                .split(/[\s,|\/·]+/)
                .map((s) => s.trim())
                .filter(Boolean);
            if (tokens.length > 0) tokens.forEach(pushTag);
        });

        // count 기준 내림차순 정렬 후 상위 100개만 반환
        const sorted = Array.from(tagCountMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 100)
            .map(([key]) => key);

        return NextResponse.json({ success: true, tags: sorted });
    } catch (error) {
        console.error("GET /api/places/tags error:", error);
        // 실패 시에도 빈 배열을 반환하여 페이지가 계속 동작하도록 함
        return NextResponse.json({ success: true, tags: [] });
    } finally {
        if (connection) connection.release();
    }
}
