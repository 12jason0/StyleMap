// src/app/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SectionHeader from "@/components/SectionHeader";

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
    view_count: number;
    viewCount?: number;
    tags?: string[];
};

export default function Home() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [searchRegion, setSearchRegion] = useState("");
    const [currentSlide, setCurrentSlide] = useState(0);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchDeltaX, setTouchDeltaX] = useState(0);
    const [isTouching, setIsTouching] = useState(false);
    const [, setLoading] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showAdModal, setShowAdModal] = useState(false);
    const [isSignup, setIsSignup] = useState(false);
    const [showAiAdModal, setShowAiAdModal] = useState(false);
    const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
    const router = useRouter();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const qs = new URLSearchParams({ limit: "12", imagePolicy: "all-or-one-missing", lean: "1" });
                if (searchRegion.trim()) qs.set("region", searchRegion.trim());
                const response = await fetch(`/api/courses?${qs.toString()}` as any, {
                    cache: "force-cache",
                    next: { revalidate: 300 },
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    setCourses(data);
                } else if (data.error) {
                    console.error("API Error:", data.error, data.details);
                    alert("데이터베이스 연결에 실패했습니다. 환경 변수와 데이터베이스 설정을 확인해주세요.");
                    setCourses([]);
                } else {
                    console.error("Unexpected data format:", data);
                    setCourses([]);
                }
            } catch (error) {
                console.error("Failed to fetch courses:", error);
                alert("코스 데이터를 가져오는데 실패했습니다. 네트워크 연결을 확인해주세요.");
                setCourses([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [searchRegion]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const welcome = urlParams.get("welcome");
        const loginSuccess = urlParams.get("login_success");
        const signupSuccess = urlParams.get("signup_success");

        if (welcome === "true") {
            setShowWelcome(true);
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
            setTimeout(() => setShowWelcome(false), 3000);
        }

        if (loginSuccess === "true") {
            setShowLoginModal(true);
            const token = localStorage.getItem("authToken");
            if (token) {
                window.dispatchEvent(new CustomEvent("authTokenChange", { detail: { token } }));
            } else {
                window.dispatchEvent(new CustomEvent("authTokenChange"));
            }
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
        }

        if (signupSuccess === "true") {
            setShowLoginModal(true);
            setIsSignup(true);
            localStorage.setItem("loginTime", Date.now().toString());
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
        }
    }, []);

    useEffect(() => {
        const handleAuthChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const token = customEvent.detail?.token || localStorage.getItem("authToken");
            if (token) {
                const hideUntil = localStorage.getItem("hideAiAdUntil");
                const now = new Date().getTime();
                if (!hideUntil || now > parseInt(hideUntil)) {
                    setShowAiAdModal(true);
                }
            }
        };
        window.addEventListener("authTokenChange", handleAuthChange as EventListener);
        return () => window.removeEventListener("authTokenChange", handleAuthChange as EventListener);
    }, []);

    const topCourses = courses.slice(0, 5);
    const hotCourses = courses
        .filter((c) => c.participants > 10 || c.rating >= 4.5)
        .sort((a, b) => b.participants - a.participants || b.rating - a.rating)
        .slice(0, 6);
    const newCourses = courses.slice(-3);

    const handleStartOnboarding = () => {
        if (!localStorage.getItem("authToken")) {
            setShowLoginRequiredModal(true);
            return;
        }
        router.push("/onboarding");
    };

    return (
        <>
            {showWelcome && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in hover:cursor-pointer">
                    <div className="flex items-center space-x-2">
                        <span className="text-xl">🎉</span>
                        <span className="font-semibold">카카오 로그인에 성공했습니다!</span>
                    </div>
                </div>
            )}
            {showLoginModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-fade-in relative">
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
                        <button
                            onClick={() => {
                                setShowLoginModal(false);
                                window.dispatchEvent(new CustomEvent("authTokenChange"));
                                if (isSignup) {
                                    setShowAdModal(true);
                                } else {
                                    const hideUntil = localStorage.getItem("hideAiAdUntil");
                                    const now = new Date().getTime();
                                    if (!hideUntil || now > parseInt(hideUntil)) {
                                        setShowAiAdModal(true);
                                    }
                                }
                            }}
                            className="mt-6 btn-primary hover:cursor-pointer"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
            {showAdModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ">
                    <div className="bg-white rounded-2xl p-6 max-w-md mx-4 text-center animate-fade-in relative">
                        <button
                            onClick={() => setShowAdModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors hover:cursor-pointer"
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
                        <div className="bg-sky-500 text-white p-4 rounded-lg mb-4">
                            <div className="text-2xl font-bold mb-1">AI 추천 티켓 1회</div>
                            <div className="text-sm opacity-90">개인 맞춤 코스 추천을 받아보세요!</div>
                        </div>
                        <button onClick={() => setShowAdModal(false)} className="btn-primary hover:cursor-pointer">
                            확인
                        </button>
                    </div>
                </div>
            )}
            {showAiAdModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md mx-4 text-center animate-fade-in relative">
                        <button
                            onClick={() => {
                                setShowAiAdModal(false);
                                const hideUntil = new Date().getTime() + 3600000;
                                localStorage.setItem("hideAiAdUntil", hideUntil.toString());
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors hover:cursor-pointer"
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
                        <div className="bg-sky-500 text-white p-4 rounded-lg mb-4">
                            <div className="text-2xl font-bold mb-1">AI 맞춤 추천</div>
                            <div className="text-sm opacity-90">당신만을 위한 특별한 여행 코스</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setShowAiAdModal(false);
                                    router.push("/personalized-home");
                                }}
                                className="btn-primary hover:cursor-pointer"
                            >
                                AI 코스 시작하기
                            </button>
                            <button
                                onClick={() => {
                                    setShowAiAdModal(false);
                                    const hideUntil = new Date().getTime() + 3600000;
                                    localStorage.setItem("hideAiAdUntil", hideUntil.toString());
                                }}
                                className="text-gray-500 text-sm hover:text-gray-700 transition-colors hover:cursor-pointer"
                            >
                                1시간 동안 보지 않기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showLoginRequiredModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md mx-4 text-center animate-fade-in relative">
                        <button
                            onClick={() => setShowLoginRequiredModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors hover:cursor-pointer"
                            aria-label="닫기"
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
                        <div className="text-4xl mb-3">🔐</div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
                        <p className="text-gray-600 mb-5">내 취향을 설정하려면 먼저 로그인해 주세요.</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowLoginRequiredModal(false)}
                                className="hover:cursor-pointer btn-secondary"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    setShowLoginRequiredModal(false);
                                    router.push("/login?redirect=/onboarding");
                                }}
                                className="hover:cursor-pointer btn-primary"
                            >
                                로그인하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* [수정] 기존의 main, aside, grid 레이아웃을 모두 제거하고 콘텐츠만 남깁니다.
              - pt-20, pb-20과 같은 상/하단 여백도 제거하여 LayoutContent와 중복되지 않도록 합니다.
            */}
            <>
                {/* 지역 검색 바 */}
                <div className="max-w-7xl mx-auto px-4 mb-4 mt-2">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchRegion}
                            onChange={(e) => setSearchRegion(e.target.value)}
                            placeholder="지역으로 검색"
                            className="w-full border border-gray-300 rounded-xl py-3 pl-11 pr-28 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
                        <button
                            onClick={() => setSearchRegion(searchRegion.trim())}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                        >
                            검색
                        </button>
                    </div>
                    {searchRegion && <div className="mt-2 text-sm text-gray-600">지역: "{searchRegion}" 추천 결과</div>}
                </div>
                {/* Hero Section - 대형 슬라이드 (카드형) */}
                <section className="relative px-4">
                    <div
                        className="relative h-[200px] overflow-hidden shadow-xl mr-8"
                        style={{
                            transform: `translateX(${touchDeltaX * 0.15}px)`,
                            transition: isTouching ? "none" : "transform 300ms ease",
                        }}
                        onTouchStart={(e) => {
                            if (e.touches && e.touches.length > 0) {
                                setTouchStartX(e.touches[0].clientX);
                                setTouchDeltaX(0);
                                setIsTouching(true);
                            }
                        }}
                        onTouchMove={(e) => {
                            if (touchStartX !== null && e.touches && e.touches.length > 0) {
                                setTouchDeltaX(e.touches[0].clientX - touchStartX);
                            }
                        }}
                        onTouchEnd={() => {
                            const threshold = 40;
                            const total = topCourses.length > 0 ? Math.min(5, topCourses.length) : 0;
                            if (total === 0) return;
                            if (touchDeltaX > threshold) {
                                setCurrentSlide((prev) => (prev - 1 + total) % total);
                            } else if (touchDeltaX < -threshold) {
                                setCurrentSlide((prev) => (prev + 1) % total);
                            }
                            setTouchStartX(null);
                            setTouchDeltaX(0);
                            setIsTouching(false);
                        }}
                    >
                        <div className="absolute inset-0">
                            {topCourses.map((course, index) => (
                                <div
                                    key={course.id}
                                    className={`absolute inset-0 transition-all duration-1000 ${
                                        index === currentSlide ? "opacity-100 z-20" : "opacity-100 z-10"
                                    }`}
                                >
                                    <div className="absolute inset-0">
                                        {course.imageUrl ? (
                                            <Image
                                                src={course.imageUrl}
                                                alt={course.title}
                                                fill
                                                priority={index === currentSlide}
                                                sizes="100vw"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-white" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50" />
                                    </div>
                                    <div className="absolute bottom-6 right-6 left-6 text-right">
                                        <h2 className="text-white font-extrabold text-3xl leading-tight drop-shadow-md">
                                            {course.location}
                                        </h2>
                                        <div className="text-white/90 text-sm mt-3 opacity-90">
                                            #{course.concept}
                                            {Array.isArray(course.tags) && course.tags.length > 0 && (
                                                <>
                                                    {" "}
                                                    {course.tags.slice(0, 3).map((t) => (
                                                        <span key={t} className="ml-2">
                                                            #{t}
                                                        </span>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 left-4 z-30">
                                        <span className="px-3 py-1 rounded-full bg-black/60 text-white text-sm font-semibold">
                                            {currentSlide + 1}/{topCourses.length || 1}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {topCourses.length > 1 && (
                        <div
                            className="pointer-events-none absolute top-0 bottom-0 right-2 w-6 overflow-hidden shadow-lg border border-white/80 border-r-0 z-40"
                            style={{
                                transform: `translateX(${touchDeltaX * 0.15}px)`,
                                transition: isTouching ? "none" : "transform 300ms ease",
                            }}
                        >
                            {topCourses[(currentSlide + 1) % topCourses.length].imageUrl ? (
                                <Image
                                    src={topCourses[(currentSlide + 1) % topCourses.length].imageUrl}
                                    alt="next preview"
                                    fill
                                    sizes="200px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-200" />
                            )}
                            <div className="absolute inset-0 bg-black/20" />
                        </div>
                    )}
                </section>
                {/* 컨셉/인기/새로운 탭형 가로 캐러셀 섹션 */}
                <TabbedConcepts courses={courses} hotCourses={hotCourses} newCourses={newCourses} />
                {/* 개인화 온보딩 섹션 */}
                <section className="py-8 pb-30">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white border border-sky-100 p-6 md:p-8">
                            <div className="flex items-start gap-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-sky-100 text-sky-700 text-2xl">
                                    💫
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                                        더 정확한 추천을 원하시나요?
                                    </h3>
                                    <p className="text-gray-600 mb-4">3분만 투자하면 완전히 다른 경험을 드릴게요</p>
                                    <button
                                        onClick={handleStartOnboarding}
                                        className="hover:cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-colors"
                                    >
                                        내 취향 설정하기<span>→</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </>
        </>
    );
}

function TabbedConcepts({
    courses,
    hotCourses,
    newCourses,
}: {
    courses: Course[];
    hotCourses: Course[];
    newCourses: Course[];
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"concept" | "popular" | "new">("concept");
    const [conceptCountsMap, setConceptCountsMap] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const res = await fetch("/api/courses/concept-counts");
                if (res.ok) {
                    const data = await res.json();
                    if (data && typeof data === "object") setConceptCountsMap(data);
                }
            } catch {}
        };
        fetchCounts();
    }, []);

    const representativeImageByConcept: Record<string, string | undefined> = courses.reduce((acc, c) => {
        const key = c.concept || "기타";
        if (!acc[key] && c.imageUrl) acc[key] = c.imageUrl;
        return acc;
    }, {} as Record<string, string | undefined>);

    const conceptItems = (
        Object.keys(conceptCountsMap).length
            ? Object.entries(conceptCountsMap).map(([name, count]) => ({
                  name,
                  count,
                  imageUrl: representativeImageByConcept[name],
              }))
            : Object.entries(
                  courses.reduce<Record<string, { count: number; imageUrl?: string }>>((acc, c) => {
                      const key = c.concept || "기타";
                      if (!acc[key]) acc[key] = { count: 0, imageUrl: c.imageUrl };
                      acc[key].count += 1;
                      return acc;
                  }, {})
              ).map(([name, v]) => ({ name, count: v.count, imageUrl: v.imageUrl }))
    ).sort((a, b) => b.count - a.count);
    const trackClasses =
        "flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar scrollbar-hide cursor-grab select-none";
    const cardBase =
        "snap-start w-[130px] min-w-[130px] bg-white rounded-2xl overflow-hidden border border-gray-200 text-black flex flex-col items-center py-6";

    // 데스크톱에서 마우스 드래그로 가로 스크롤 지원
    const trackRef = useRef<HTMLDivElement | null>(null);
    const isDownRef = useRef(false);
    const startXRef = useRef(0);
    const scrollLeftRef = useRef(0);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!trackRef.current) return;
        isDownRef.current = true;
        startXRef.current = e.pageX;
        scrollLeftRef.current = trackRef.current.scrollLeft;
        trackRef.current.classList.add("cursor-grabbing");
    };

    const handleMouseLeave = () => {
        if (!trackRef.current) return;
        isDownRef.current = false;
        trackRef.current.classList.remove("cursor-grabbing");
    };

    const handleMouseUp = () => {
        if (!trackRef.current) return;
        isDownRef.current = false;
        trackRef.current.classList.remove("cursor-grabbing");
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDownRef.current || !trackRef.current) return;
        e.preventDefault();
        const dx = e.pageX - startXRef.current;
        trackRef.current.scrollLeft = scrollLeftRef.current - dx;
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!trackRef.current) return;
        // 세로 휠을 가로 스크롤로 변환
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            trackRef.current.scrollLeft += e.deltaY;
        }
    };

    return (
        <section className="py-12">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex gap-3 mb-6">
                    {[
                        { key: "concept", label: "테마별" },
                        { key: "popular", label: "인기별" },
                        { key: "new", label: "새로운" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`px-4 py-2 rounded-full border transition shadow-sm ${
                                activeTab === tab.key
                                    ? "bg-white text-blue-600 border-blue-300 shadow"
                                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-white"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {activeTab === "concept" && (
                    <div
                        className={trackClasses}
                        ref={trackRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onWheel={handleWheel}
                    >
                        {conceptItems.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => router.push(`/courses?concept=${encodeURIComponent(item.name)}`)}
                                className={`${cardBase} cursor-pointer`}
                            >
                                <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border">
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={144}
                                            height={144}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200" />
                                    )}
                                </div>
                                <div className="text-lg font-bold text-gray-900 mb-2">{item.name}</div>
                                <div className="text-blue-600 font-semibold">{item.count}개 코스</div>
                            </button>
                        ))}
                    </div>
                )}
                {activeTab === "popular" && (
                    <div
                        className={trackClasses}
                        ref={trackRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onWheel={handleWheel}
                    >
                        {hotCourses.slice(0, 10).map((c) => (
                            <Link key={c.id} href={`/courses/${c.id}`} className={`${cardBase}`}>
                                <div className="w-20 h-20  rounded-full overflow-hidden mb-4 border">
                                    {c.imageUrl ? (
                                        <Image
                                            src={c.imageUrl}
                                            alt={c.title}
                                            width={144}
                                            height={144}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200" />
                                    )}
                                </div>
                                <div className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{c.title}</div>
                                <div className="text-blue-600 font-semibold">{c.view_count} 조회</div>
                            </Link>
                        ))}
                    </div>
                )}
                {activeTab === "new" && (
                    <div
                        className={trackClasses}
                        ref={trackRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onWheel={handleWheel}
                    >
                        {newCourses
                            .slice()
                            .reverse()
                            .map((c) => (
                                <Link key={c.id} href={`/courses/${c.id}`} className={`${cardBase}`}>
                                    <div className="w-20 h-20  rounded-full overflow-hidden mb-4 border">
                                        {c.imageUrl ? (
                                            <Image
                                                src={c.imageUrl}
                                                alt={c.title}
                                                width={144}
                                                height={144}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200" />
                                        )}
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{c.title}</div>
                                    <div className="text-blue-600 font-semibold">NEW</div>
                                </Link>
                            ))}
                    </div>
                )}
            </div>
        </section>
    );
}

function ConceptSection() {
    const [conceptCounts, setConceptCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    useEffect(() => {
        const fetchConceptCounts = async () => {
            try {
                const response = await fetch("/api/courses/concept-counts");
                if (response.ok) {
                    const data = await response.json();
                    setConceptCounts(data);
                }
            } catch (error) {
                console.error("Error fetching concept counts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchConceptCounts();
    }, []);
    const concepts = [
        { name: "카페투어", icon: "☕", gradient: "from-brown-400 to-amber-500" },
        { name: "맛집탐방", icon: "🍜", gradient: "from-red-400 to-orange-500" },
        { name: "인생샷", icon: "📸", gradient: "from-purple-400 to-pink-500" },
        { name: "체험", icon: "🎯", gradient: "from-blue-400 to-indigo-500" },
        { name: "힐링", icon: "🌿", gradient: "from-green-400 to-emerald-500" },
        { name: "공연·전시", icon: "🏛️", gradient: "from-yellow-400 to-orange-500" },
        { name: "야경", icon: "🌃", gradient: "from-purple-500 to-pink-500" },
        { name: "힙스터", icon: "🎨", gradient: "from-pink-400 to-red-500" },
        { name: "테마파크", icon: "🎢", gradient: "from-indigo-500 to-sky-500" },
        { name: "핫플레이스", icon: "🔥", gradient: "from-rose-500 to-pink-500" },
        { name: "이색데이트", icon: "🧪", gradient: "from-teal-400 to-cyan-500" },
    ];
    if (loading) {
        return (
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold mb-4 text-black">이런 컨셉은 어때요?</h2>
                        <p className="text-gray-600 text-lg">취향에 맞는 코스를 찾아보세요</p>
                    </div>
                    <div className="flex justify-center">
                        <div className="text-xl">로딩 중...</div>
                    </div>
                </div>
            </section>
        );
    }
    return (
        <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4">
                <SectionHeader title="이런 컨셉은 어때요?" subtitle="취향에 맞는 코스를 찾아보세요" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {concepts.slice(0, showAll ? concepts.length : 6).map((concept, index) => {
                        const hasCourses = conceptCounts[concept.name] > 0;
                        return (
                            <div
                                key={concept.name}
                                className={`relative transition-all duration-500 ${
                                    index >= 6 && showAll
                                        ? "animate-fade-in-up opacity-100"
                                        : index >= 6
                                        ? "opacity-0 scale-95"
                                        : "opacity-100"
                                }`}
                                style={{ animationDelay: index >= 6 ? `${(index - 6) * 100}ms` : "0ms" }}
                            >
                                {hasCourses ? (
                                    <Link
                                        href={`/courses?concept=${encodeURIComponent(concept.name)}`}
                                        className="group relative p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 block"
                                    >
                                        <div className="absolute inset-0 bg-sky-100 opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity" />
                                        <div className="relative text-center">
                                            <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">
                                                {concept.icon}
                                            </div>
                                            <h3 className="font-bold text-gray-800">{concept.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {conceptCounts[concept.name]}개 코스
                                            </p>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="group relative p-6 bg-gray-100 rounded-2xl shadow-md block">
                                        <div className="relative text-center">
                                            <div className="text-4xl mb-3 opacity-50">{concept.icon}</div>
                                            <h3 className="font-bold text-gray-500">{concept.name}</h3>
                                            <p className="text-sm text-gray-400 mt-1">준비중</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {!showAll && concepts.length > 6 && (
                    <div className="text-center mt-8">
                        <button
                            onClick={() => setShowAll(true)}
                            className="rounded-2xl hover:cursor-pointer w-full border border-gray-200 bg-white text-gray-800 py-3 text-center hover:bg-gray-50"
                        >
                            더 많은 컨셉 보기 ({concepts.length - 6}개 더)
                        </button>
                    </div>
                )}
                {showAll && (
                    <div className="text-center mt-8">
                        <button
                            onClick={() => setShowAll(false)}
                            className="rounded-2xl hover:cursor-pointer w-full border border-gray-200 bg-white text-gray-800 py-3 text-center hover:bg-gray-50"
                        >
                            접기
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
