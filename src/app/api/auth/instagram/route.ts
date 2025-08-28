import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    return NextResponse.json(
        {
            error: "이 엔드포인트는 사용되지 않습니다. Instagram 로그인은 콜백 방식을 사용합니다.",
        },
        { status: 404 }
    );
}
