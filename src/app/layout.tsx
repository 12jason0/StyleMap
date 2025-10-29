// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";
import ClientBodyLayout from "./ClientBodyLayout";

const inter = Inter({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "DoNa",
    description: "두나 - 당신만의 여행 코스",
    verification: {
        other: { "naver-site-verification": "247ecc2d7ba71441970f8ae0c7cf097cf3d895f1" },
    },
    icons: {
        icon: "https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/logo/donalogo_512.png",
        apple: "https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/logo/donalogo_512.png",
        shortcut: "https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/logo/donalogo_512.png",
    },
};

function BodyLayout({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <ClientBodyLayout>{children}</ClientBodyLayout>
        </Providers>
    );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="ko">
            <head>
                {/* ✅ 파비콘 직접 추가 */}
                <link
                    rel="icon"
                    type="image/png"
                    href="https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/logo_512.png"
                />
                <link
                    rel="apple-touch-icon"
                    href="https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/logo_512.png"
                />
                <link rel="shortcut icon" href="https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/logo_512.png" />

                <link rel="preconnect" href="https://cdn.jsdelivr.net" />
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"
                />
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/stylesheet.css" />
                {/* 지도 스크립트는 전역이 아닌 지도 컴포넌트에서 지연 로드 */}
                <link
                    rel="preconnect"
                    href="https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com"
                    crossOrigin="anonymous"
                />
                <link rel="dns-prefetch" href="https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com" />
            </head>
            <body
                className={`${inter.variable} antialiased h-screen overflow-hidden flex flex-col typography-smooth`}
                style={{
                    background: "var(--background)",
                    color: "var(--foreground)",
                    backgroundImage:
                        "radial-gradient(1200px 600px at 10% -10%, rgba(153,192,142,0.18), transparent), radial-gradient(900px 500px at 110% 20%, rgba(121,160,111,0.15), transparent)",
                }}
            >
                <style>{`
                    :root {
                        --brand-green: #7aa06f;
                        --brand-green-dark: #5f8d57;
                    }
                    button.bg-blue-600, button.bg-blue-700, .bg-blue-600, .bg-blue-700 {
                        background-color: var(--brand-green) !important;
                    }
                    a.text-blue-600 { color: var(--brand-green) !important; }
                    a.hover\:text-blue-800:hover { color: var(--brand-green-dark) !important; }
                    .focus\:ring-blue-500:focus { --tw-ring-color: var(--brand-green) !important; }
                    .focus\:border-transparent:focus { border-color: var(--brand-green) !important; }
                `}</style>
                <Script src="https://www.googletagmanager.com/gtag/js?id=G-R3EYQNXY13" strategy="afterInteractive" />
                <Script
                    id="ga4-init"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: "window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-R3EYQNXY13');",
                    }}
                />
                <BodyLayout>{children}</BodyLayout>
            </body>
        </html>
    );
}
