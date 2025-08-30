import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
    try {
        const connection = await pool.getConnection();

        try {
            // 현재 날짜 기준으로 진행 중인 팝업만 가져오기
            const currentDate = new Date().toISOString().split("T")[0];

            const [popups] = await connection.execute(
                `
                SELECT 
                    id,
                    name,
                    introduction,
                    address,
                    latitude,
                    longitude,
                    start_date,
                    end_date,
                    city
                FROM popups 
                WHERE start_date <= ? AND end_date >= ?
                ORDER BY start_date DESC
            `,
                [currentDate, currentDate]
            );

            const popupsArray = popups as Array<{
                id: number;
                name: string;
                introduction: string;
                address: string;
                latitude: number;
                longitude: number;
                start_date: string;
                end_date: string;
                city: string;
            }>;

            // 팝업 데이터 포맷팅
            const formattedPopups = popupsArray.map((popup) => ({
                id: popup.id,
                title: popup.name,
                description: popup.introduction,
                period: `${popup.start_date} - ${popup.end_date}`,
                location: popup.address,
                city: popup.city,
                latitude: Number(popup.latitude),
                longitude: Number(popup.longitude),
                // 카테고리별 분류 (주소나 이름을 기반으로 추정)
                category: getCategoryFromAddress(popup.address, popup.name),
                // 상태 결정 (종료일이 가까우면 'ending', 시작일이 가까우면 'coming', 그 외는 'ongoing')
                status: getStatusFromDates(popup.start_date, popup.end_date),
            }));

            return NextResponse.json(formattedPopups);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("팝업 데이터 조회 오류:", error);
        return NextResponse.json({ error: "팝업 데이터를 가져오는데 실패했습니다." }, { status: 500 });
    }
}

// 주소와 이름을 기반으로 카테고리 추정
function getCategoryFromAddress(address: string, name: string): string {
    // const lowerAddress = address.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerName.includes("카페") || lowerName.includes("cafe") || lowerName.includes("디저트")) {
        return "food";
    }
    if (lowerName.includes("패션") || lowerName.includes("fashion") || lowerName.includes("의류")) {
        return "fashion";
    }
    if (lowerName.includes("아트") || lowerName.includes("art") || lowerName.includes("갤러리")) {
        return "art";
    }
    if (lowerName.includes("라이프") || lowerName.includes("lifestyle") || lowerName.includes("홈")) {
        return "lifestyle";
    }
    if (lowerName.includes("테크") || lowerName.includes("tech") || lowerName.includes("전자")) {
        return "tech";
    }

    // 기본값
    return "lifestyle";
}

// 날짜를 기반으로 상태 결정
function getStatusFromDates(startDate: string, endDate: string): string {
    const now = new Date();
    // const start = new Date(startDate);
    const end = new Date(endDate);
    const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilEnd <= 7) {
        return "ending";
    } else if (daysUntilEnd <= 30) {
        return "ongoing";
    } else {
        return "coming";
    }
}
