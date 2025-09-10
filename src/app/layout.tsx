import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { metadata } from "./metadata";
import LayoutContent from "@/components/LayoutContent";

const inter = Inter({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko">
            <body className={`${inter.variable} antialiased min-h-screen flex flex-col`}>
                <LayoutContent>{children}</LayoutContent>
                {/* Kakao Map 스크립트: 프로덕션에서 키가 없거나 브라우저가 아닐 때 주입 안함 */}
                {process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ? (
                    <Script
                        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&libraries=services,clusterer&autoload=false`}
                        strategy="beforeInteractive"
                        onError={(e) => {
                            // eslint-disable-next-line no-console
                            console.error("Kakao script failed to load", e);
                        }}
                    />
                ) : (
                    <script
                        dangerouslySetInnerHTML={{
                            __html: "console.warn('Kakao Map key not provided; skipping script injection');",
                        }}
                    />
                )}
            </body>
        </html>
    );
}

export { metadata };
