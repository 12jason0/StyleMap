import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

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

    try {
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

        // Prisma 기반 1차 후보 조회 (예산 필터는 문자열이므로 이후 JS로 후처리)
        const prismaWhere: any = {};
        if (loc && locationMap[loc]) {
            prismaWhere.location = { contains: locationMap[loc] };
        }
        if (allKeywords.length > 0) {
            prismaWhere.OR = allKeywords.map((kw) => ({
                OR: [{ title: { contains: kw } }, { description: { contains: kw } }, { concept: { contains: kw } }],
            }));
        }

        const rows = (await (prisma as any).courses.findMany({
            where: prismaWhere,
            orderBy: [{ rating: "desc" }, { id: "desc" }],
            take: 50,
            select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                location: true,
                price: true,
                imageUrl: true,
                concept: true,
                rating: true,
            },
        })) as any[];

        // 예산 필터 JS 후처리
        const parsePrice = (v?: string | null) => {
            if (!v) return 0;
            const n = String(v).replace(/[^0-9]/g, "");
            return Number(n || 0);
        };
        let filtered = rows;
        if (budget) {
            if (budget === "30-50")
                filtered = rows.filter((r) => parsePrice(r.price) >= 30000 && parsePrice(r.price) <= 50000);
            else if (budget === "50-80")
                filtered = rows.filter((r) => parsePrice(r.price) >= 50000 && parsePrice(r.price) <= 80000);
            else if (budget === "80+") filtered = rows.filter((r) => parsePrice(r.price) >= 80000);
        }

        const courses = filtered.slice(0, 3).map((c) => ({
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
    }
}
