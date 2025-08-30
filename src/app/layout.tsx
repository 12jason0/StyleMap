import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { metadata } from "./metadata";
import LayoutContent from "@/components/LayoutContent";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko">
            <head>
                {/* 카카오맵 스크립트를 가장 먼저 로드 */}
                <Script
                    src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${
                        process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY || "454509cd057a6d814ccd7258302a359c"
                    }&libraries=services,clusterer`}
                    strategy="beforeInteractive"
                />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
                <LayoutContent>{children}</LayoutContent>
            </body>
        </html>
    );
}

export { metadata };
