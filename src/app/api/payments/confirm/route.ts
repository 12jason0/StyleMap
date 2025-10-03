import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PlanKey = "basic" | "premium" | "vip";

const PLAN_PRICING: Record<PlanKey, { amount: number; coupons: number; name: string }> = {
    basic: { amount: 4900, coupons: 5, name: "AI 추천 쿠폰 5개 (Basic)" },
    premium: { amount: 14900, coupons: 20, name: "AI 추천 쿠폰 20개 (Premium)" },
    vip: { amount: 29900, coupons: 50, name: "AI 추천 쿠폰 50개 (VIP)" },
};

export async function POST(req: NextRequest) {
    try {
        const { paymentKey, orderId, amount, plan } = (await req.json()) as {
            paymentKey?: string;
            orderId?: string;
            amount?: number;
            plan?: PlanKey;
        };

        if (!paymentKey || !orderId || !amount || !plan || !(plan in PLAN_PRICING)) {
            return NextResponse.json({ success: false, error: "INVALID_REQUEST" }, { status: 400 });
        }

        const secretKey = process.env.TOSS_SECRET_KEY;
        if (!secretKey) {
            return NextResponse.json({ success: false, error: "SERVER_NOT_CONFIGURED" }, { status: 500 });
        }

        const expected = PLAN_PRICING[plan];
        if (Number(amount) !== expected.amount) {
            return NextResponse.json({ success: false, error: "INVALID_AMOUNT" }, { status: 400 });
        }

        const authHeader = Buffer.from(`${secretKey}:`).toString("base64");
        const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
            method: "POST",
            headers: {
                Authorization: `Basic ${authHeader}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ paymentKey, orderId, amount }),
            cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                { success: false, error: data?.message || "PAYMENT_CONFIRM_FAILED", details: data },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            orderId,
            approvedAt: data?.approvedAt || null,
            method: data?.method || null,
            couponsAwarded: expected.coupons,
            plan,
        });
    } catch (e) {
        return NextResponse.json({ success: false, error: "UNKNOWN_ERROR" }, { status: 500 });
    }
}
