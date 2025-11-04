/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "origin-when-cross-origin" },
                    { key: "X-XSS-Protection", value: "1; mode=block" },
                    {
                        key: "Content-Security-Policy",
                        value: (() => {
                            const isDev = process.env.NODE_ENV !== "production";
                            const scriptSrc = [
                                "'self'",
                                "'unsafe-inline'",
                                ...(isDev ? ["'unsafe-eval'"] : []),
                                "https://oapi.map.naver.com",
                                "https://openapi.map.naver.com",
                                "https://ssl.pstatic.net",
                                "https://www.googletagmanager.com",
                                "https://www.google-analytics.com",
                                // 개발 환경에서 네이버 지도 HTTP 엔드포인트 허용 (로컬 테스트 보조)
                                ...(isDev ? ["http://oapi.map.naver.com", "http://nrbe.map.naver.net"] : []),
                            ].join(" ");
                            const styleSrc = [
                                "'self'",
                                "'unsafe-inline'",
                                "https://ssl.pstatic.net",
                                "https://cdn.jsdelivr.net",
                            ].join(" ");
                            // 이미지: HTTPS 전체 허용 + data/blob (운영 중 외부 CDN 이미지 다수 사용 시 필요)
                            const imgSrc = [
                                "'self'",
                                "data:",
                                "blob:",
                                "https:",
                                // 개발 환경에서만 http 이미지 허용
                                ...(isDev ? ["http:"] : []),
                            ].join(" ");
                            const connectSrc = [
                                "'self'",
                                "https://oapi.map.naver.com",
                                "https://openapi.map.naver.com",
                                "https://naveropenapi.apigw.ntruss.com",
                                "https://kr-col-ext.nelo.navercorp.com",
                                "https://www.google-analytics.com",
                                "https://www.googletagmanager.com",
                                "https://analytics.google.com",
                                "https://stats.g.doubleclick.net",
                                "https://region1.google-analytics.com",
                                // 개발 환경에서 네이버 지도 HTTP/HTTPS 보조 엔드포인트 허용
                                ...(isDev
                                    ? [
                                          "http://oapi.map.naver.com",
                                          "http://nrbe.map.naver.net",
                                          "https://nrbe.map.naver.net",
                                      ]
                                    : []),
                            ].join(" ");
                            const fontSrc = ["'self'", "data:", "https://cdn.jsdelivr.net"].join(" ");
                            const frameSrc = ["'self'", "https://www.googletagmanager.com"].join(" ");
                            return (
                                `default-src 'self'; ` +
                                `script-src ${scriptSrc}; ` +
                                `style-src ${styleSrc}; ` +
                                `img-src ${imgSrc}; ` +
                                `connect-src ${connectSrc}; ` +
                                `font-src ${fontSrc}; ` +
                                `frame-src ${frameSrc};`
                            );
                        })(),
                    },
                ],
            },
        ];
    },
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "images.unsplash.com" },
            // ✅ 새 서울 버킷 주소 추가
            { protocol: "https", hostname: "stylemap-seoul.s3.ap-northeast-2.amazonaws.com" },
            // 기존 시드니 버킷 주소 (이제 필요 없다면 이 줄은 삭제해도 됩니다)
            { protocol: "https", hostname: "stylemap-images.s3.ap-southeast-2.amazonaws.com" },
            // 환경변수로 추가 도메인 허용 (이 부분은 그대로 둡니다)
            ...(process.env.NEXT_IMAGE_EXTRA_DOMAINS
                ? process.env.NEXT_IMAGE_EXTRA_DOMAINS.split(",")
                      .map((d) => d.trim())
                      .filter(Boolean)
                      .map((host) => ({ protocol: "https", hostname: host }))
                : []),
        ],
        // S3 원본 403 이슈 회피 및 탐색 속도 개선: 개발 단계에서는 이미지 최적화 비활성화
        unoptimized: true,
    },
    // experimental 옵션 제거 (빌드 경고 방지)
};

module.exports = nextConfig;
