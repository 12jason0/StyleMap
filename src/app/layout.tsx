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
            <body className={`${inter.variable} antialiased min-h-screen flex flex-col typography-smooth`}>
                {/* Google tag (gtag.js) */}
                <Script src="https://www.googletagmanager.com/gtag/js?id=G-R3EYQNXY13" strategy="afterInteractive" />
                <Script
                    id="ga4-init"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: "window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-R3EYQNXY13');",
                    }}
                />
                <LayoutContent>{children}</LayoutContent>

                {/* --- 여기에 카카오맵 SDK 스크립트를 추가했습니다 --- */}
                <Script
                    src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&libraries=services,clusterer,drawing&autoload=false`}
                    strategy="beforeInteractive"
                />
            </body>
        </html>
    );
}
