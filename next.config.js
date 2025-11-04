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
                                "https://vercel.live", // ✅ 추가
                                "https://*.vercel.live", // ✅ 추가
                                "https://oapi.map.naver.com",
                                "https://openapi.map.naver.com",
                                "https://ssl.pstatic.net",
                                "https://nrbe.pstatic.net", // ✅ 추가
                                "https://*.pstatic.net", // ✅ 추가 (모든 pstatic.net 서브도메인 허용)
                                "https://www.googletagmanager.com",
                                "https://www.google-analytics.com",
                                ...(isDev ? ["http://oapi.map.naver.com", "http://nrbe.map.naver.net"] : []),
                            ].join(" ");
                            const styleSrc = [
                                "'self'",
                                "'unsafe-inline'",
                                "https://ssl.pstatic.net",
                                "https://cdn.jsdelivr.net",
                            ].join(" ");
                            const imgSrc = ["'self'", "data:", "blob:", "https:", ...(isDev ? ["http:"] : [])].join(
                                " "
                            );
                            const connectSrc = [
                                "'self'",
                                "https://vercel.live", // ✅ 추가
                                "https://*.vercel.live", // ✅ 추가
                                "https://nrbe.pstatic.net", // ✅ 추가
                                "https://*.pstatic.net", // ✅ 추가
                                "https://oapi.map.naver.com",
                                "https://openapi.map.naver.com",
                                "https://naveropenapi.apigw.ntruss.com",
                                "https://kr-col-ext.nelo.navercorp.com",
                                "https://www.google-analytics.com",
                                "https://www.googletagmanager.com",
                                "https://analytics.google.com",
                                "https://stats.g.doubleclick.net",
                                "https://region1.google-analytics.com",
                                ...(isDev
                                    ? [
                                          "http://oapi.map.naver.com",
                                          "http://nrbe.map.naver.net",
                                          "https://nrbe.map.naver.net",
                                      ]
                                    : []),
                            ].join(" ");
                            const fontSrc = ["'self'", "data:", "https://cdn.jsdelivr.net"].join(" ");
                            const frameSrc = [
                                "'self'",
                                "https://vercel.live", // ✅ 추가
                                "https://www.googletagmanager.com",
                            ].join(" ");
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
            { protocol: "https", hostname: "stylemap-seoul.s3.ap-northeast-2.amazonaws.com" },
            { protocol: "https", hostname: "stylemap-images.s3.ap-southeast-2.amazonaws.com" },
            ...(process.env.NEXT_IMAGE_EXTRA_DOMAINS
                ? process.env.NEXT_IMAGE_EXTRA_DOMAINS.split(",")
                      .map((d) => d.trim())
                      .filter(Boolean)
                      .map((host) => ({ protocol: "https", hostname: host }))
                : []),
        ],
        unoptimized: true,
    },
};

module.exports = nextConfig;
