"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isMapPage = pathname === "/map";
    const isAuthPage = pathname === "/login" || pathname === "/signup";
    const isCourseDetailPage = pathname.startsWith("/courses/");

    return (
        <>
            <Header />
            <main className="flex-1">{children}</main>
            {!isMapPage && !isAuthPage && <Footer />}
        </>
    );
}
