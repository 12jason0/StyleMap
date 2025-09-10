import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import LayoutContent from "@/components/LayoutContent";

const inter = Inter({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "StyleMap",
    description: "AI가 추천하는 나만의 여행 코스, 스타일맵",
    verification: {
        other: { "naver-site-verification": "04bc95b70771b389d02d3cd52d52c76dfe9b85c3" },
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko">
            <body className={`${inter.variable} antialiased min-h-screen flex flex-col`}>
                <LayoutContent>{children}</LayoutContent>
            </body>
        </html>
    );
}
