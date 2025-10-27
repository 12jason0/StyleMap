"use client";

import React from "react";
import { usePathname } from "next/navigation";
import LayoutContent from "@/components/LayoutContent";
import Footer from "@/components/Footer";

export default function ClientBodyLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isGarden = pathname?.startsWith("/garden");
    const isEscapeId = pathname ? /^\/escape\/[^/]+$/.test(pathname) : false;
    return isGarden ? (
        <>{children}</>
    ) : (
        <>
            <LayoutContent>{children}</LayoutContent>
            {!isEscapeId && <Footer />}
        </>
    );
}
