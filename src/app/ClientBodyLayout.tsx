"use client";

import React from "react";
import { usePathname } from "next/navigation";
import LayoutContent from "@/components/LayoutContent";

export default function ClientBodyLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isGarden = pathname?.startsWith("/garden");
    return isGarden ? <>{children}</> : <LayoutContent>{children}</LayoutContent>;
}
