"use client";

import React from "react";
import { usePathname } from "next/navigation";
import LayoutContent from "@/components/LayoutContent";

export default function ClientBodyLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isGarden = pathname?.startsWith("/garden");
    React.useEffect(() => {
        // Next.js Dev Tools 배지/버튼 강제 제거 (개발용)
        const removeDevBadge = () => {
            const selectors = [
                "[data-next-badge]",
                "[data-nextjs-dev-tools-button]",
                "button[data-nextjs-dev-tools-button]",
                "#nextjs-dev-tools-menu",
                "#nextjs-devtools-container",
                '[aria-label="Open Next.js Dev Tools"]',
                '[aria-haspopup="menu"][aria-controls*="nextjs"]',
                'nextjs-devtools',
            ];
            const removeFrom = (root: Document | ShadowRoot | HTMLElement) => {
                selectors.forEach((sel) => {
                    try {
                        // @ts-ignore
                        const list = root.querySelectorAll?.(sel) || [];
                        // @ts-ignore
                        list.forEach((el: Element) => el.remove());
                    } catch {}
                });
                // @ts-ignore
                const all: any[] = root.querySelectorAll?.("*") ? Array.from(root.querySelectorAll("*")) : [];
                all.forEach((el) => {
                    // @ts-ignore
                    if (el && el.shadowRoot) {
                        // @ts-ignore
                        removeFrom(el.shadowRoot);
                    }
                });
            };
            removeFrom(document);
        };
        removeDevBadge();
        const mo = new MutationObserver(() => removeDevBadge());
        try {
            mo.observe(document.documentElement, { childList: true, subtree: true });
        } catch {}
        // 간헐적 재부착 대비: 짧은 인터벌로 몇 초간 반복 제거
        const interval = window.setInterval(removeDevBadge, 1000);
        window.setTimeout(() => window.clearInterval(interval), 10000);
        return () => {
            try {
                mo.disconnect();
            } catch {}
            window.clearInterval(interval);
        };
    }, []);
    return isGarden ? <>{children}</> : <LayoutContent>{children}</LayoutContent>;
}
