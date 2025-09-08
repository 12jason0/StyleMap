"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// import KakaoMap from "@/components/KakaoMap";

type Course = {
    id: string;
    title: string;
    description: string;
    duration: string;
    location: string;
    price: string;
    imageUrl: string;
    concept: string;
    rating: number;
};

// 유튜브 관련 타입/유틸 제거

export default function BreadTourPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    // 유튜브 제거
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // 선택 영상 제거
    const instagramHandle = "hwa.ngaeng";
    const instagramUrl = `https://www.instagram.com/${instagramHandle}/`;
    // const [reels, setReels] = useState<
    //     { id: string; shortcode: string; title: string; url: string; thumbnail: string }[]
    // >([]);
    // const [posts, setPosts] = useState<
    //     { id: string; shortcode: string; title: string; url: string; thumbnail: string; isVideo: boolean }[]
    // >([]);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError(null);
                // 코스 로드 (빵지순례 컨셉)
                const res = await fetch("/api/courses?concept=빵지순례", { cache: "no-store" });
                const data = await res.json();
                if (Array.isArray(data)) setCourses(data);

                // 유튜브 관련 로딩 제거

                // 인스타/유튜브 임시 비활성화
            } catch (e) {
                setError("데이터를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const placesForMap = [] as any[];

    return (
        <main className="min-h-screen bg-white text-black pt-24">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">🍞 빵지순례</h1>
                    <Link href="/" className="text-blue-600 hover:underline">
                        ← 홈으로
                    </Link>
                </div>

                {loading && <div className="p-6">불러오는 중...</div>}
                {error && <div className="p-6 text-red-600">{error}</div>}

                {!loading && !error && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 왼쪽 영역 임시 비활성화 */}
                        <div className="lg:col-span-1">
                            <div className="p-4 border rounded-xl text-sm text-gray-500">
                                인스타/유튜브/코스 섹션은 현재 비활성화되었습니다.
                            </div>
                        </div>

                        {/* 오른쪽 지도 비활성화 */}
                        <div className="lg:col-span-2">
                            <div className="p-4 border rounded-xl text-sm text-gray-500">
                                지도가 현재 비활성화되었습니다.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
