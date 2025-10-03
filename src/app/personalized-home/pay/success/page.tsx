"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaySuccessPage() {
    const params = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"pending" | "ok" | "fail">("pending");
    const [message, setMessage] = useState("결제 확인 중입니다...");

    useEffect(() => {
        const paymentKey = params.get("paymentKey");
        const orderId = params.get("orderId");
        const amount = Number(params.get("amount"));
        const plan = (params.get("plan") as "basic" | "premium" | "vip") || "basic";
        if (!paymentKey || !orderId || !amount) return;

        (async () => {
            try {
                const res = await fetch("/api/payments/confirm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentKey, orderId, amount, plan }),
                });
                const data = await res.json();
                if (!res.ok || !data?.success) {
                    setStatus("fail");
                    setMessage(data?.error || "결제 확인에 실패했습니다.");
                    return;
                }
                const award = Number(data?.couponsAwarded) || 0;
                if (award > 0) {
                    try {
                        const cur = parseInt(localStorage.getItem("userCoupons") || "0");
                        const next = cur + award;
                        localStorage.setItem("userCoupons", String(next));
                    } catch {}
                }
                setStatus("ok");
                setMessage("결제가 완료되었습니다. 쿠폰이 적립되었어요.");
                setTimeout(() => router.push("/personalized-home"), 1500);
            } catch (e) {
                setStatus("fail");
                setMessage("네트워크 오류로 결제 확인에 실패했습니다.");
            }
        })();
    }, [params, router]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-white text-black">
            <div className="p-8 rounded-2xl border shadow-sm text-center">
                <h1 className="text-2xl font-bold mb-2">
                    {status === "ok" ? "결제 성공" : status === "fail" ? "결제 실패" : "확인 중"}
                </h1>
                <p className="text-gray-700">{message}</p>
            </div>
        </main>
    );
}
