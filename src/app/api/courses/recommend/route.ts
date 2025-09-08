import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

const locationMap: Record<string, string> = {
    gangnam: "강남",
    seongsu: "성수",
    hongdae: "홍대",
    jongno: "종로",
};

const keywordMap: Record<string, string[]> = {
    cafe: ["카페", "디저트", "브런치"],
    shopping: ["쇼핑", "패션", "팝업", "스토어", "마켓"],
    culture: ["문화", "전시", "예술", "뮤지엄", "박물관"],
    nature: ["자연", "공원", "산책", "하천", "강", "호수"],
    energetic: ["액티비티", "활동", "체험"],
    relaxed: ["힐링", "휴식", "카페"],
    adventurous: ["모험", "체험", "탐험"],
    foodie: ["맛집", "음식", "레스토랑"],
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const mood = (searchParams.get("mood") || "").trim();
    const activity = (searchParams.get("activity") || "").trim();
    const loc = (searchParams.get("location") || "").trim();
    const budget = (searchParams.get("budget") || "").trim();

    let connection: any;
    try {
        connection = await pool.getConnection();

        const where: string[] = [];
        const params: any[] = [];

        // 지역 필터 (DB 칼럼: location)
        if (loc && locationMap[loc]) {
            where.push("location LIKE ?");
            params.push(`%${locationMap[loc]}%`);
        }

        // 활동/무드 키워드 필터 (title/description/concept에 포함) - 선택된 지역 필터와 항상 AND 결합
        const actKeywords = activity && keywordMap[activity] ? keywordMap[activity] : [];
        const moodKeywords = mood && keywordMap[mood] ? keywordMap[mood] : [];
        const allKeywords = Array.from(new Set([...actKeywords, ...moodKeywords]));
        if (allKeywords.length > 0) {
            const likeBlock = allKeywords
                .map(() => "(title LIKE ? OR description LIKE ? OR concept LIKE ?)")
                .join(" OR ");
            where.push(`(${likeBlock})`);
            allKeywords.forEach((kw) => {
                const lk = `%${kw}%`;
                params.push(lk, lk, lk);
            });
        }

        // 예산 필터 숫자 추출 (REGEXP 없이 안전하게: 콤마/원/공백 제거 후 캐스팅)
        const numericPriceExpr =
            "CAST(NULLIF(REPLACE(REPLACE(REPLACE(CAST(IFNULL(price,'') AS CHAR), ',', ''), '원', ''), ' ', ''), '') AS UNSIGNED)";
        if (budget) {
            if (budget === "30-50") {
                where.push(`${numericPriceExpr} BETWEEN 30000 AND 50000`);
            } else if (budget === "50-80") {
                where.push(`${numericPriceExpr} BETWEEN 50000 AND 80000`);
            } else if (budget === "80+") {
                where.push(`${numericPriceExpr} >= 80000`);
            }
        }

        const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
        const sql = `SELECT id, title, description, duration, location, price, imageUrl, concept, IFNULL(rating,0) AS rating
                     FROM courses ${whereSql}
                     ORDER BY IFNULL(rating,0) DESC, id DESC
                     LIMIT 3`;

        const [rows] = await connection.execute(sql, params);
        const courses = (rows as any[]).map((c) => ({
            id: String(c.id),
            title: c.title,
            description: c.description || "",
            duration: c.duration || "",
            location: c.location || "",
            price: c.price || "",
            imageUrl: c.imageUrl || "",
            concept: c.concept || "",
            rating: Number(c.rating) || 0,
            reviewCount: 0,
            participants: 0,
            highlights: [c.concept || "추천", c.location || ""].filter(Boolean),
        }));

        return NextResponse.json({ success: true, courses });
    } catch (error) {
        console.error("GET /api/courses/recommend error:", error);
        return NextResponse.json({ success: false, error: "Failed to recommend courses" }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
