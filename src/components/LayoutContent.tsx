// src/components/LayoutContent.tsx

"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isEscapeIntroPage = pathname.startsWith("/escape/intro");

    return (
        <div className="min-h-screen bg-white">
            <div className="relative min-h-screen bg-white min-[600px]:w-[500px] min-[600px]:mx-auto min-[600px]:shadow-lg">
                {/* 헤더 영역 */}
                <div className={`${isEscapeIntroPage ? "hidden" : "block"}`}>
                    <Header />
                </div>
                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
}
