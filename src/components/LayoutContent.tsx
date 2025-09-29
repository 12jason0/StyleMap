"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isMapPage = pathname === "/map";
    const isAuthPage = pathname === "/login" || pathname === "/signup";
    // const isCourseDetailPage = pathname.startsWith("/courses/");
    const isPersonalizedHomePage = pathname === "/personalized-home";
    const isEscapeIntroPage = pathname.startsWith("/escape/intro");
    const isCourseStartPage = pathname.startsWith("/courses/") && pathname.endsWith("/start");
    const isOnboardingPage = pathname === "/onboarding";

    return (
        <div className="min-h-screen bg-white">
            <div className="min-[960px]:w-[500px] min-[960px]:mx-auto min-[960px]:min-h-screen min-[960px]:bg-white">
                {/* 모바일(<960px)에서는 헤더를 메인 밖에 표시 */}
                <div className={`${isEscapeIntroPage ? "hidden" : "block"} min-[960px]:hidden`}>
                    <Header />
                </div>
                <main className="flex-1">
                    {/* 데스크톱(≥960px)에서는 헤더를 메인 내부 상단에 표시 */}
                    <div className={`${isEscapeIntroPage ? "hidden" : "hidden min-[960px]:block"}`}>
                        <Header />
                    </div>
                    {children}
                </main>
            </div>
        </div>
    );
}
