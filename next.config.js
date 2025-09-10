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
        domains: [
            "images.unsplash.com",
            "stylemap-images.s3.ap-southeast-2.amazonaws.com",
            ...(process.env.NEXT_IMAGE_EXTRA_DOMAINS
                ? process.env.NEXT_IMAGE_EXTRA_DOMAINS.split(",").map((d) => d.trim())
                : []),
        ],
    },
    // experimental 옵션 제거 (빌드 경고 방지)
};

module.exports = nextConfig;
