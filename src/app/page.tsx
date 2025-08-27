"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

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
    reviewCount: number;
    participants: number;
};

export default function Home() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const router = useRouter();

    // 코스 데이터 가져오기
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await fetch("/api/courses");
                const data = await response.json();

                // API 응답이 배열인지 확인하고 에러 객체인지 확인
                if (Array.isArray(data)) {
                    setCourses(data.slice(0, 12));
                } else if (data.error) {
                    console.error("API Error:", data.error, data.details);
                    // 에러 발생 시 더미 데이터 사용
                    setCourses([
                        {
                            id: "1",
                            title: "성수 감성 카페투어",
                            description: "인스타 감성 카페 3곳을 둘러보는 특별한 코스",
                            duration: "3시간",
                            location: "성수동",
                            price: "30000원",
                            imageUrl: "/images/CoffeTrand.png",
                            concept: "핫플투어",
                            rating: 4.8,
                            reviewCount: 23,
                            participants: 15,
                        },
                        {
                            id: "2",
                            title: "홍대 팝업스토어 투어",
                            description: "최신 팝업스토어를 한번에",
                            duration: "4시간",
                            location: "홍대",
                            price: "40000원",
                            imageUrl: "/images/Popup.png",
                            concept: "핫플투어",
                            rating: 4.6,
                            reviewCount: 18,
                            participants: 12,
                        },
                        {
                            id: "3",
                            title: "비오는날 실내 데이트",
                            description: "날씨 걱정 없는 완벽한 실내 코스",
                            duration: "5시간",
                            location: "강남",
                            price: "50000원",
                            imageUrl: "/images/RainDate.png",
                            concept: "힐링여행",
                            rating: 4.7,
                            reviewCount: 31,
                            participants: 8,
                        },
                    ]);
                } else {
                    console.error("Unexpected data format:", data);
                    setCourses([]);
                }
            } catch (error) {
                console.error("Failed to fetch courses:", error);
                // 더미 데이터 폴백
                setCourses([
                    {
                        id: "1",
                        title: "성수 감성 카페투어",
                        description: "인스타 감성 카페 3곳을 둘러보는 특별한 코스",
                        duration: "3시간",
                        location: "성수동",
                        price: "30000원",
                        imageUrl: "/images/CoffeTrand.png",
                        concept: "핫플투어",
                        rating: 4.8,
                        reviewCount: 23,
                        participants: 15,
                    },
                    {
                        id: "2",
                        title: "홍대 팝업스토어 투어",
                        description: "최신 팝업스토어를 한번에",
                        duration: "4시간",
                        location: "홍대",
                        price: "40000원",
                        imageUrl: "/images/Popup.png",
                        concept: "핫플투어",
                        rating: 4.6,
                        reviewCount: 18,
                        participants: 12,
                    },
                    {
                        id: "3",
                        title: "비오는날 실내 데이트",
                        description: "날씨 걱정 없는 완벽한 실내 코스",
                        duration: "5시간",
                        location: "강남",
                        price: "50000원",
                        imageUrl: "/images/RainDate.png",
                        concept: "힐링여행",
                        rating: 4.7,
                        reviewCount: 31,
                        participants: 8,
                    },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    // 슬라이드 자동 재생
    useEffect(() => {
        if (courses.length > 0) {
            const interval = setInterval(() => {
                setCurrentSlide((prev) => (prev + 1) % Math.min(5, courses.length));
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [courses.length]);

    const topCourses = courses.slice(0, 5);
    const hotCourses = courses.filter((c) => c.participants > 10).slice(0, 6);
    const newCourses = courses.slice(-3);

    return (
        <>
            <Header />
            <main className="min-h-screen bg-white">
                {/* Hero Section - 대형 슬라이드 */}
                <section className="relative h-[500px] overflow-hidden">
                    {topCourses.map((course, index) => (
                        <div
                            key={course.id}
                            className={`absolute inset-0 transition-all duration-1000 ${
                                index === currentSlide ? "opacity-100 z-20" : "opacity-0 z-10"
                            }`}
                        >
                            {/* 배경 이미지 */}
                            <div className="absolute inset-0">
                                <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                            </div>

                            {/* 콘텐츠 */}
                            <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center">
                                <div className="max-w-2xl">
                                    <div className="mb-4 flex items-center gap-3">
                                        <span className="px-4 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
                                            🔥 실시간 HOT #{index + 1}
                                        </span>
                                        <div className="flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                            <span className="text-white text-sm font-medium">
                                                {course.participants}명 참여중
                                            </span>
                                        </div>
                                    </div>

                                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{course.title}</h1>

                                    <p className="text-xl text-white/90 mb-6">{course.description}</p>

                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="flex items-center gap-1">
                                            <span className="text-yellow-400 text-2xl">★</span>
                                            <span className="text-white font-bold text-lg">{course.rating}</span>
                                            <span className="text-white/70">({course.reviewCount})</span>
                                        </div>
                                        <span className="text-white/70">|</span>
                                        <span className="text-white">📍 {course.location}</span>
                                        <span className="text-white">⏱ {course.duration}</span>
                                        <span className="text-white">💰 {course.price}</span>
                                    </div>

                                    <button
                                        onClick={() => router.push(`/courses/${course.id}`)}
                                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
                                    >
                                        코스 시작하기 →
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* 슬라이드 인디케이터 */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
                        {topCourses.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`transition-all duration-300 ${
                                    index === currentSlide
                                        ? "w-12 h-2 bg-white"
                                        : "w-2 h-2 bg-white/50 hover:bg-white/70"
                                } rounded-full`}
                            />
                        ))}
                    </div>
                </section>

                {/* 컨셉 선택 섹션 */}
                <ConceptSection />

                {/* 실시간 인기 코스 */}
                <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-bold mb-4 text-black">🔥 지금 가장 핫한 코스</h2>
                            <p className="text-gray-600 text-lg">실시간으로 많은 사람들이 참여중인 코스</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {hotCourses.map((course, index) => (
                                <Link
                                    key={course.id}
                                    href={`/courses/${course.id}`}
                                    className={`
                                        group relative bg-white rounded-2xl overflow-hidden shadow-xl 
                                        hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2
                                        ${index === 0 ? "md:col-span-2 md:row-span-2" : ""}
                                    `}
                                    onMouseEnter={() => setHoveredCard(course.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                >
                                    <div className={`relative overflow-hidden ${index === 0 ? "h-96" : "h-64"}`}>
                                        <img
                                            src={course.imageUrl}
                                            alt={course.title}
                                            className={`
                                                w-full h-full object-cover transition-transform duration-700
                                                ${hoveredCard === course.id ? "scale-110" : "scale-100"}
                                            `}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                                        {/* 순위 배지 */}
                                        {index < 3 && (
                                            <div className="absolute top-4 left-4">
                                                <span
                                                    className={`
                                                    px-4 py-2 font-bold rounded-full text-white shadow-lg
                                                    ${
                                                        index === 0
                                                            ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-lg"
                                                            : index === 1
                                                            ? "bg-gradient-to-r from-gray-300 to-gray-400"
                                                            : "bg-gradient-to-r from-orange-400 to-orange-600"
                                                    }
                                                `}
                                                >
                                                    {index === 0 ? "👑 1위" : index === 1 ? "🥈 2위" : "🥉 3위"}
                                                </span>
                                            </div>
                                        )}

                                        {/* 실시간 참여자 */}
                                        <div className="absolute top-4 right-4">
                                            <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-sm font-bold">{course.participants}명</span>
                                            </div>
                                        </div>

                                        {/* 하단 정보 */}
                                        <div className="absolute bottom-0 left-0 right-0 p-6">
                                            <h3
                                                className={`font-bold text-white mb-2 ${
                                                    index === 0 ? "text-2xl" : "text-xl"
                                                }`}
                                            >
                                                {course.title}
                                            </h3>
                                            <div className="flex items-center gap-3 text-white/90 text-sm">
                                                <span>📍 {course.location}</span>
                                                <span>⏱ {course.duration}</span>
                                                <span className="flex items-center gap-1">
                                                    <span className="text-yellow-400">★</span> {course.rating}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* NEW 코스 섹션 */}
                <section className="py-16">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-bold mb-4 text-black">✨ NEW 코스</h2>
                            <p className="text-gray-600 text-lg">이번 주 새로 추가된 코스</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {newCourses.map((course) => (
                                <Link
                                    key={course.id}
                                    href={`/courses/${course.id}`}
                                    className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all"
                                >
                                    <div className="relative h-48 overflow-hidden">
                                        <img
                                            src={course.imageUrl}
                                            alt={course.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <span className="absolute top-4 left-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                                            NEW
                                        </span>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="font-bold text-xl mb-2">{course.title}</h3>
                                        <p className="text-gray-600 text-sm mb-4">{course.description}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 text-sm">{course.location}</span>
                                            <span className="font-bold text-blue-600">{course.price}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}

// 컨셉 섹션
function ConceptSection() {
    const concepts = [
        { name: "핫플투어", icon: "🔥", gradient: "from-orange-400 to-red-500" },
        { name: "로컬맛집", icon: "🍜", gradient: "from-yellow-400 to-orange-500" },
        { name: "야경명소", icon: "🌃", gradient: "from-purple-500 to-pink-500" },
        { name: "힐링여행", icon: "🌿", gradient: "from-green-400 to-emerald-500" },
        { name: "액티비티", icon: "🎯", gradient: "from-blue-400 to-indigo-500" },
        { name: "가성비", icon: "💎", gradient: "from-gray-600 to-gray-800" },
    ];

    return (
        <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold mb-4 text-black">이런 컨셉은 어때요?</h2>
                    <p className="text-gray-600 text-lg">취향에 맞는 코스를 찾아보세요</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {concepts.map((concept) => (
                        <Link
                            key={concept.name}
                            href={`/courses?concept=${concept.name}`}
                            className="group relative p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <div
                                className={`absolute inset-0 bg-gradient-to-br ${concept.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`}
                            />
                            <div className="relative text-center">
                                <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">
                                    {concept.icon}
                                </div>
                                <h3 className="font-bold text-gray-800">{concept.name}</h3>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
