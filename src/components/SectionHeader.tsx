"use client";

import React from "react";

type SectionHeaderProps = {
    title: string;
    subtitle?: string;
    align?: "left" | "center";
    className?: string;
};

export default function SectionHeader({ title, subtitle, align = "center", className = "" }: SectionHeaderProps) {
    return (
        <div className={`mb-8 md:mb-12 ${align === "center" ? "text-center" : "text-left"} ${className}`}>
            <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4 text-black">{title}</h2>
            {subtitle && <p className="text-gray-600 text-base md:text-lg">{subtitle}</p>}
        </div>
    );
}
