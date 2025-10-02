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
    },
    // experimental 옵션 제거 (빌드 경고 방지)
};

module.exports = nextConfig;
