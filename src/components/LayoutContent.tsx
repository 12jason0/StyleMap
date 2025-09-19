"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isMapPage = pathname === "/map";
    const isAuthPage = pathname === "/login" || pathname === "/signup";
    // const isCourseDetailPage = pathname.startsWith("/courses/");
    const isPersonalizedHomePage = pathname === "/personalized-home";
    const isEscapeIntroPage = pathname.startsWith("/escape/intro");

    return (
        <>
            <div className={isEscapeIntroPage ? "hidden" : undefined}>
                <Header />
            </div>
            <main className="flex-1">{children}</main>
            <div
                className={
                    isEscapeIntroPage || isMapPage || isAuthPage || isPersonalizedHomePage ? "hidden" : undefined
                }
            >
                <Footer />
            </div>
        </>
    );
}
