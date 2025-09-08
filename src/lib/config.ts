export const publicConfig = {
    kakaoClientId: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
};

export function assertPublicConfig(): void {
    if (!publicConfig.kakaoClientId) {
        throw new Error("NEXT_PUBLIC_KAKAO_CLIENT_ID is required");
    }
}

export const serverConfig = {
    jwtSecret: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET,
    kakaoClientId: process.env.KAKAO_CLIENT_ID,
    kakaoClientSecret: process.env.KAKAO_CLIENT_SECRET,
};

export function assertServerConfig(): void {
    if (!serverConfig.jwtSecret) {
        throw new Error("JWT_SECRET (or NEXTAUTH_SECRET) is required");
    }
}
