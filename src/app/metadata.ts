import type { Metadata } from "next";

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    title: {
        default: "StyleMap",
        template: "%s | StyleMap",
    },
    description:
        "StyleMap은 여러분의 스타일을 지도에 표시하고 공유할 수 있는 플랫폼입니다. 개인화된 추천과 지도로 더 편리하게 탐색하세요.",
    keywords: ["여행", "지도", "코스 추천", "카카오맵", "맛집", "카페", "핫플"],
    openGraph: {
        title: "StyleMap",
        description: "당신의 취향을 반영한 장소와 코스를 한 눈에. StyleMap에서 개인화된 추천을 받아보세요.",
        type: "website",
        url: "/",
        siteName: "StyleMap",
        images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "StyleMap" }],
        locale: "ko_KR",
    },
    twitter: {
        card: "summary_large_image",
        title: "StyleMap",
        description: "당신의 취향을 반영한 장소와 코스를 한 눈에. StyleMap에서 개인화된 추천을 받아보세요.",
        images: ["/og-image.png"],
    },
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
};
