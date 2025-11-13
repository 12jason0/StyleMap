import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const jsKey = 
            process.env.NEXT_PUBLIC_KAKAO_JS_KEY ||
            process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
        
        if (!jsKey) {
            return NextResponse.json({ jsKey: null }, { status: 200 });
        }
        
        return NextResponse.json({ jsKey });
    } catch (error: any) {
        return NextResponse.json({ jsKey: null, error: error?.message }, { status: 500 });
    }
}

