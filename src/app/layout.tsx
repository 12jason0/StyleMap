// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import LayoutContent from "@/components/LayoutContent";
import { Providers } from "@/components/Providers";

const inter = Inter({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "StyleMap",
    description: "AI가 추천하는 나만의 여행 코스, 스타일맵",
    verification: {
        other: { "naver-site-verification": "1ee13408c2d7ca40ef28f4556f288a139cac5b38" },
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko">
            <head>
                <link rel="preconnect" href="https://cdn.jsdelivr.net" />
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"
                />
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/stylesheet.css" />
                <Script
                    strategy="beforeInteractive"
                    src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${
                        process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || ""
                    }`}
                />
                <Script
                    id="naver-auth-failure"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{
                        __html: "window.navermap_authFailure = function () { console.error('Naver Maps auth failed - check ncpKeyId and domain.'); };",
                    }}
                />
            </head>
            <body className={`${inter.variable} antialiased min-h-screen flex flex-col typography-smooth bg-gray-100`}>
                <Script src="https://www.googletagmanager.com/gtag/js?id=G-R3EYQNXY13" strategy="afterInteractive" />
                <Script
                    id="ga4-init"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: "window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-R3EYQNXY13');",
                    }}
                />
                <Providers>
                    <LayoutContent>{children}</LayoutContent>
                </Providers>
            </body>
        </html>
    );
}
