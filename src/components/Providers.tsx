// src/components/Providers.tsx

"use client"; // 이 파일이 클라이언트 컴포넌트임을 명시합니다.

import { NavermapsProvider } from "react-naver-maps";

export function Providers({ children }: { children: React.ReactNode }) {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || "";
    return <NavermapsProvider ncpClientId={clientId}>{children}</NavermapsProvider>;
}
