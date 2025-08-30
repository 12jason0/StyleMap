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
    const [, setLoading] = useState(true);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showAdModal, setShowAdModal] = useState(false);

    const [isSignup, setIsSignup] = useState(false);
    const [showAiAdModal, setShowAiAdModal] = useState(false);
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
                    // 데이터베이스 연결 실패 시 사용자에게 알림
                    alert("데이터베이스 연결에 실패했습니다. 환경 변수와 데이터베이스 설정을 확인해주세요.");
                    setCourses([]);
                } else {
                    console.error("Unexpected data format:", data);
                    setCourses([]);
                }
            } catch (error) {
                console.error("Failed to fetch courses:", error);
                // 네트워크 오류 시 사용자에게 알림
                alert("코스 데이터를 가져오는데 실패했습니다. 네트워크 연결을 확인해주세요.");
                setCourses([]);
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

    // 환영 메시지 및 로그인 모달 처리
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const welcome = urlParams.get("welcome");
        const loginSuccess = urlParams.get("login_success");
        const signupSuccess = urlParams.get("signup_success");

        if (welcome === "true") {
            setShowWelcome(true);

            // URL에서 파라미터 제거
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);

            // 3초 후 환영 메시지 숨기기
            setTimeout(() => {
                setShowWelcome(false);
            }, 3000);
        }

        if (loginSuccess === "true") {
            setShowLoginModal(true);

            // URL에서 파라미터 제거
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
        }

        if (signupSuccess === "true") {
            setShowLoginModal(true);
            setIsSignup(true);

            // URL에서 파라미터 제거
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
        }
    }, []);

    // 로그인 상태 초기화 및 AI 광고 모달 자동 표시 처리
    useEffect(() => {
        // 로그인 상태 초기화 (페이지 로드 시 무조건 로그아웃 상태로)
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");

        // Header 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new CustomEvent("authTokenChange"));

        // 로그인 상태 변경 감지
        const handleAuthChange = () => {
            const token = localStorage.getItem("authToken");
            if (token) {
                // 로그인 성공 시 AI 모달 표시
                const hideUntil = localStorage.getItem("hideAiAdUntil");
                const now = new Date().getTime();

                if (!hideUntil || now > parseInt(hideUntil)) {
                    setShowAiAdModal(true);
                }
            }
        };

        // 이벤트 리스너 등록
        window.addEventListener("authTokenChange", handleAuthChange);

        return () => {
            window.removeEventListener("authTokenChange", handleAuthChange);
        };
    }, []);

    const topCourses = courses.slice(0, 5);
    const hotCourses = courses
        .filter((c) => c.participants > 10 || c.rating >= 4.5)
        .sort((a, b) => b.participants - a.participants || b.rating - a.rating)
        .slice(0, 6);
    const newCourses = courses.slice(-3);

    return (
        <>
            <Header />

            {/* 환영 메시지 */}
            {showWelcome && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
                    <div className="flex items-center space-x-2">
                        <span className="text-xl">🎉</span>
                        <span className="font-semibold">카카오 로그인에 성공했습니다!</span>
                    </div>
                </div>
            )}

            {/* 로그인 성공 모달 */}
            {showLoginModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-fade-in relative">
                        {/* X 버튼 */}
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>

                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인 성공!</h2>
                        <p className="text-gray-600 mb-4">StyleMap에 오신 것을 환영합니다</p>
                        <div className="flex items-center justify-center space-x-2 text-green-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span className="font-semibold">환영합니다!</span>
                        </div>

                        {/* 확인 버튼 */}
                        <button
                            onClick={() => {
                                setShowLoginModal(false);
                                // Header 업데이트를 위한 이벤트 발생
                                window.dispatchEvent(new CustomEvent("authTokenChange"));
                                // 회원가입인 경우에만 광고 모달 표시
                                if (isSignup) {
                                    setShowAdModal(true);
                                } else {
                                    // 로그인인 경우 AI 광고 모달 표시
                                    const hideUntil = localStorage.getItem("hideAiAdUntil");
                                    const now = new Date().getTime();

                                    if (!hideUntil || now > parseInt(hideUntil)) {
                                        setShowAiAdModal(true);
                                    }
                                }
                            }}
                            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* 광고 모달 */}
            {showAdModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hover:cursor-pointer">
                    <div className="bg-white rounded-2xl p-6 max-w-md mx-4 text-center animate-fade-in relative">
                        {/* X 버튼 */}
                        <button
                            onClick={() => setShowAdModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>

                        <div className="text-4xl mb-4">🤖</div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">AI 추천 티켓 지급!</h2>
                        <p className="text-gray-600 mb-4">새로 가입하신 고객님을 위한 특별한 혜택</p>
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-4">
                            <div className="text-2xl font-bold mb-1">AI 추천 티켓 1회</div>
                            <div className="text-sm opacity-90">개인 맞춤 코스 추천을 받아보세요!</div>
                        </div>
                        <button
                            onClick={() => setShowAdModal(false)}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* AI 광고 모달 (홈페이지 접속 시) */}
            {showAiAdModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md mx-4 text-center animate-fade-in relative">
                        {/* X 버튼 */}
                        <button
                            onClick={() => {
                                setShowAiAdModal(false);
                                // 1시간 후 다시 표시
                                const hideUntil = new Date().getTime() + 60 * 60 * 1000; // 1시간
                                localStorage.setItem("hideAiAdUntil", hideUntil.toString());
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>

                        <div className="text-4xl mb-4">🤖</div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">AI 코스 이용해보세요!</h2>
                        <p className="text-gray-600 mb-4">개인 맞춤 AI 추천 코스를 경험해보세요</p>
                        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-4 rounded-lg mb-4">
                            <div className="text-2xl font-bold mb-1">AI 맞춤 추천</div>
                            <div className="text-sm opacity-90">당신만을 위한 특별한 여행 코스</div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setShowAiAdModal(false);
                                    router.push("/personalized-home");
                                }}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                AI 코스 시작하기
                            </button>

                            <button
                                onClick={() => {
                                    setShowAiAdModal(false);
                                    // 1시간 동안 보지 않기
                                    const hideUntil = new Date().getTime() + 60 * 60 * 1000; // 1시간
                                    localStorage.setItem("hideAiAdUntil", hideUntil.toString());
                                }}
                                className="text-gray-500 text-sm hover:text-gray-700 transition-colors"
                            >
                                1시간 동안 보지 않기
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                        className="hover:cursor-pointer px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
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
                                    className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all text-black"
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
            {/* 모바일 하단 네비게이션을 위한 여백 */}
            <div className="md:hidden h-20"></div>
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
