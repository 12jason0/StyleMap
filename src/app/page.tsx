// src/app/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { fetchWeekStamps, getLocalTodayKey, postCheckin } from "@/lib/checkinClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "@/components/ImageFallback";
import SectionHeader from "@/components/SectionHeader";
import HeroSlider from "@/components/HeroSlider";
import OnboardingSection from "@/components/OnboardingSection";

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
    const [currentSlide] = useState(0);
    const [, setLoading] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showAdModal, setShowAdModal] = useState(false);
    const [isSignup, setIsSignup] = useState(false);
    const [showAiAdModal, setShowAiAdModal] = useState(false);
    const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [weekStamps, setWeekStamps] = useState<boolean[]>([false, false, false, false, false, false, false]);
    const [animStamps, setAnimStamps] = useState<boolean[] | null>(null);
    const [isStamping, setIsStamping] = useState(false);
    const [stampCompleted, setStampCompleted] = useState(false);
    const [alreadyToday, setAlreadyToday] = useState(false);
    const [cycleProgress, setCycleProgress] = useState(0);
    const [todayIndex, setTodayIndex] = useState(0);
    const router = useRouter();
    const hasShownCheckinModalRef = useRef(false);

    // 날짜 키는 공용 유틸을 사용

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await fetch(`/api/courses?limit=100&imagePolicy=any&lean=1` as any, {
                    cache: "force-cache",
                    next: { revalidate: 300 },
                });
                if (!response.ok) {
                    setCourses([]);
                    return;
                }
                const data = await response.json().catch(() => null);
                setCourses(Array.isArray(data) ? data : []);
            } catch {
                setCourses([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

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
            maybeOpenCheckinModal();
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
            maybeOpenCheckinModal();
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
                maybeOpenCheckinModal();
            }
        };
        window.addEventListener("authTokenChange", handleAuthChange as EventListener);
        return () => window.removeEventListener("authTokenChange", handleAuthChange as EventListener);
    }, []);

    const fetchAndSetWeekStamps = async (): Promise<{ stamps: boolean[]; todayChecked: boolean } | null> => {
        const result = await fetchWeekStamps();
        if (!result) return null;
        const { stamps, todayChecked } = result;
        setWeekStamps(stamps);
        setCycleProgress((stamps.filter(Boolean).length % 7) as number);
        setAlreadyToday(todayChecked);
        return result;
    };

    const maybeOpenCheckinModal = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            const todayKey = getLocalTodayKey();
            const shownDateAtStart = localStorage.getItem("checkinModalShownDate");
            if (hasShownCheckinModalRef.current && shownDateAtStart === todayKey) return;

            const result = await fetchAndSetWeekStamps();
            const already = Boolean(result?.todayChecked);
            const shownDate = localStorage.getItem("checkinModalShownDate");
            const dismissedDate = localStorage.getItem("checkinModalDismissedDate");
            setAnimStamps(null);

            if (!already && shownDate !== todayKey && dismissedDate !== todayKey) {
                setStampCompleted(false);
                setShowCheckinModal(true);
                hasShownCheckinModalRef.current = true;
                localStorage.setItem("checkinModalShownDate", todayKey);
            }
        } catch {}
    };

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem("authToken");
            if (!token) return;
            try {
                const res = await fetch("/api/users/profile", {
                    credentials: "include",
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    setTimeout(() => {
                        maybeOpenCheckinModal();
                    }, 800);
                } else if (res.status === 401) {
                    localStorage.removeItem("authToken");
                }
            } catch {
                localStorage.removeItem("authToken");
            }
        };
        initAuth();
    }, []);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const topCourses = courses.slice(0, 5);
    const hotCourses = courses
        .slice()
        .sort(
            (a, b) =>
                ((b.view_count ?? (b as any).viewCount ?? 0) as number) -
                ((a.view_count ?? (a as any).viewCount ?? 0) as number)
        )
        .slice(0, 8);
    const newCourses = courses
        .slice()
        .sort((a, b) => {
            const ad = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
            const bd = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
            return bd - ad;
        })
        .slice(0, 8);

    const [recs, setRecs] = useState<any[]>([]);
    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem("authToken");
                const res = await fetch("/api/recommendations", {
                    cache: "no-store",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const data = await res.json().catch(() => ({}));
                if (Array.isArray(data?.recommendations)) setRecs(data.recommendations);
            } catch {}
        })();
    }, []);

    const handleStartOnboarding = () => {
        if (!localStorage.getItem("authToken")) {
            setShowLoginRequiredModal(true);
            return;
        }
        router.push("/onboarding");
    };

    return (
        <>
            {errorMessage && (
                <div className="mx-4 my-3 rounded-xl bg-red-50 border border-red-200 text-red-800 p-4">
                    <div className="flex items-start gap-2">
                        <span>⚠️</span>
                        <div className="flex-1 text-sm">{errorMessage}</div>
                        <button
                            onClick={() => setErrorMessage(null)}
                            className="text-red-700/70 hover:text-red-900"
                            aria-label="닫기"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
            {showWelcome && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in hover:cursor-pointer">
                    <div className="flex items-center space-x-2">
                        <span className="text-xl">🌿</span>
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
                        <div className="text-6xl mb-4">🌿</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인 성공!</h2>
                        <p className="text-gray-600 mb-4">두나에 오신 것을 환영합니다</p>
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
                                maybeOpenCheckinModal();
                            }}
                            className="mt-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all hover:cursor-pointer"
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
                        <div className="text-4xl mb-4">🌳</div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">AI 추천 티켓 지급!</h2>
                        <p className="text-gray-600 mb-4">새로 가입하신 고객님을 위한 특별한 혜택</p>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-lg mb-4">
                            <div className="text-2xl font-bold mb-1">AI 추천 티켓 1회</div>
                            <div className="text-sm opacity-90">개인 맞춤 코스 추천을 받아보세요!</div>
                        </div>
                        <button
                            onClick={() => setShowAdModal(false)}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all hover:cursor-pointer w-full"
                        >
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
                        <div className="text-4xl mb-4">🌳</div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            AI가 당신에게 꼭 맞는 여행 코스를 찾아드려요
                        </h2>
                        <p className="text-gray-600 mb-4">
                            몇 가지 질문에 답하면 취향에 맞는 특별한 코스가 완성됩니다.
                        </p>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-lg mb-4">
                            <div className="text-2xl font-bold mb-1">나만의 맞춤 추천</div>
                            <div className="text-sm opacity-90">고민 없이 바로 추천받고 시작해보세요</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setShowAiAdModal(false);
                                    router.push("/personalized-home");
                                }}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all hover:cursor-pointer"
                            >
                                AI로 나만의 코스 추천받기
                            </button>
                            <button
                                onClick={() => {
                                    setShowAiAdModal(false);
                                    const hideUntil = new Date().getTime() + 3600000;
                                    localStorage.setItem("hideAiAdUntil", hideUntil.toString());
                                }}
                                className="text-gray-500 text-sm hover:text-gray-700 transition-colors hover:cursor-pointer"
                            >
                                다음에 할게요 · 1시간 동안 보지 않기
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
                                className="hover:cursor-pointer px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    setShowLoginRequiredModal(false);
                                    router.push("/login?redirect=/onboarding");
                                }}
                                className="hover:cursor-pointer bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
                            >
                                로그인하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showCheckinModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">출석 체크</h3>
                        <p className="text-gray-600 mb-1">이번 주 출석 현황</p>
                        {alreadyToday && <p className="text-sm text-green-600 mb-3">오늘 이미 출석했습니다</p>}
                        <div className="grid grid-cols-7 gap-2 mb-4">
                            {new Array(7).fill(0).map((_, i) => {
                                const stamped = (weekStamps[i] || (!!animStamps && !!animStamps[i])) as boolean;
                                const pulse = !!animStamps && !!animStamps[i];
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        <span
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-transform duration-150 ${
                                                stamped
                                                    ? "bg-gradient-to-br from-lime-400 to-green-500 text-white"
                                                    : "bg-gray-200 text-gray-600"
                                            } ${pulse ? "scale-110" : ""}`}
                                        >
                                            {stamped ? "🌱" : String(i + 1)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-3 justify-center">
                            {!stampCompleted && !alreadyToday ? (
                                <>
                                    <button
                                        onClick={() => {
                                            const todayKey = getLocalTodayKey();
                                            localStorage.setItem("checkinModalDismissedDate", todayKey);
                                            setShowCheckinModal(false);
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        나중에
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (isStamping) return;
                                            setIsStamping(true);
                                            try {
                                                const data = await postCheckin();
                                                if (!data.ok) {
                                                    setIsStamping(false);
                                                    return;
                                                }
                                                // 이미 오늘 출석한 경우: 서버 배열로 동기화하고 종료
                                                if (data.alreadyChecked) {
                                                    if (Array.isArray(data.weekStamps)) setWeekStamps(data.weekStamps as boolean[]);
                                                    if (typeof data.weekCount === "number") setCycleProgress(((data.weekCount as number) % 7) as number);
                                                    setAlreadyToday(true);
                                                    setIsStamping(false);
                                                    setStampCompleted(true);
                                                    return;
                                                }
                                                // 애니메이션: 현재 채워진 개수 기준 다음 칸에 도장
                                                const filled = weekStamps.filter(Boolean).length;
                                                const targetIdx = Math.min(6, filled);

                                                setAnimStamps([false, false, false, false, false, false, false]);
                                                setTimeout(() => {
                                                    setAnimStamps((_) => {
                                                        const next = [false, false, false, false, false, false, false];
                                                        next[targetIdx] = true;
                                                        return next;
                                                    });
                                                    setTimeout(() => {
                                                        if (Array.isArray(data.weekStamps)) {
                                                            setWeekStamps(data.weekStamps as boolean[]);
                                                            if (typeof data.weekCount === "number") setCycleProgress(((data.weekCount as number) % 7) as number);
                                                        } else {
                                                            setWeekStamps((prev) => {
                                                                const next = [...prev];
                                                                next[targetIdx] = true;
                                                                return next;
                                                            });
                                                            setCycleProgress((((filled + 1) % 7) as number));
                                                        }
                                                        setAnimStamps(null);
                                                        setIsStamping(false);
                                                        setStampCompleted(true);
                                                    }, 800);
                                                }, 50);
                                            } catch {
                                                setIsStamping(false);
                                            }
                                        }}
                                        className={`px-4 py-2 rounded-lg text-white font-semibold ${
                                            isStamping
                                                ? "bg-gray-400"
                                                : "bg-gradient-to-r from-lime-400 to-green-500 hover:from-lime-500 hover:to-green-600"
                                        }`}
                                    >
                                        {isStamping ? "도장 찍는 중..." : "출석 체크 하기"}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        const todayKey = getLocalTodayKey();
                                        localStorage.setItem("checkinModalDismissedDate", todayKey);
                                        setShowCheckinModal(false);
                                        setAnimStamps(null);
                                        setStampCompleted(false);
                                    }}
                                    className="hover:cursor-pointer px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600"
                                >
                                    확인
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <>
                {/* 검색 바 제거 */}
                <HeroSlider
                    items={topCourses.map((c) => ({
                        id: c.id,
                        imageUrl: c.imageUrl,
                        location: c.location,
                        concept: c.concept,
                        tags: c.tags,
                    }))}
                />
                <TabbedConcepts courses={courses} hotCourses={hotCourses} newCourses={newCourses} />
                {recs.length > 0 && (
                    <section className="py-10">
                        <div className="max-w-7xl mx-auto px-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-black flex items-center gap-2">
                                    <span className="text-2xl">🌿</span>
                                    당신을 위한 추천
                                </h2>
                                <Link
                                    href="/courses?recommended=1"
                                    aria-label="코스 더 보기"
                                    className="w-8 h-8 flex items-center justify-center rounded-full border border-green-300 text-green-700 hover:bg-green-50"
                                >
                                    ›
                                </Link>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar scrollbar-hide">
                                {recs.slice(0, 3).map((c) => (
                                    <Link
                                        key={c.id}
                                        href={`/courses/${c.id}`}
                                        className="min-w-[200px] bg-white rounded-xl shadow border border-green-100 hover:shadow-md hover:border-green-200 transition"
                                    >
                                        <div className="relative text-black w-full h-32 overflow-hidden rounded-t-xl bg-gray-200">
                                            {c.imageUrl ? (
                                                <Image
                                                    src={c.imageUrl}
                                                    alt={c.title}
                                                    fill
                                                    sizes="(max-width: 768px) 200px, 240px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200" />
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <div className="font-semibold line-clamp-1 text-black">{c.title}</div>
                                            <div className="text-sm text-gray-500 line-clamp-1">
                                                {(c as any).concept} · {(c as any).region}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
                <OnboardingSection onStart={handleStartOnboarding} />
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
        "flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar scrollbar-hide cursor-grab select-none overscroll-contain touch-pan-x";
    const cardBase =
        "snap-start w-[130px] min-w-[130px] bg-white rounded-2xl border border-gray-200 text-black flex flex-col items-center py-6";

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

    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            try {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    el.scrollLeft += e.deltaY;
                }
            } catch {}
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => {
            try {
                el.removeEventListener("wheel", onWheel as any);
            } catch {}
        };
    }, []);

    return (
        <section className="py-12">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex gap-3 mb-6 ">
                    {[
                        { key: "concept", label: "테마별" },
                        { key: "popular", label: "인기별" },
                        { key: "new", label: "새로운" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`px-4 py-2 rounded-full border transition shadow-sm hover:cursor-pointer ${
                                activeTab === tab.key
                                    ? "bg-white text-green-600 border-green-300 shadow"
                                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-white "
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
                    >
                        {conceptItems.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => router.push(`/courses?concept=${encodeURIComponent(item.name)}`)}
                                className={`${cardBase} cursor-pointer hover:border-green-200 hover:shadow-md transition`}
                            >
                                <div className="w-20 h-20 rounded-full overflow-hidden mb-4 ">
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={144}
                                            height={144}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-100" />
                                    )}
                                </div>
                                <div className="text-lg font-bold text-gray-900 mb-2">{item.name}</div>
                                <div className="text-green-600 font-semibold">{item.count}개 코스</div>
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
                    >
                        {hotCourses.map((c) => (
                            <Link
                                key={c.id}
                                href={`/courses/${c.id}`}
                                className={`${cardBase} hover:border-green-200 hover:shadow-md transition`}
                            >
                                <div className="w-20 h-20  rounded-full overflow-hidden mb-4">
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
                                <div className="text-green-600 font-semibold">
                                    {(typeof c.view_count === "number" && Number.isFinite(c.view_count)
                                        ? c.view_count
                                        : (c as any).viewCount ?? 0
                                    ).toLocaleString()}{" "}
                                    조회
                                </div>
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
                    >
                        {newCourses.map((c) => (
                            <Link
                                key={c.id}
                                href={`/courses/${c.id}`}
                                className={`${cardBase} hover:border-green-200 hover:shadow-md transition`}
                            >
                                <div className="w-20 h-20  rounded-full overflow-hidden mb-4">
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
                                <div className="text-green-600 font-semibold flex items-center gap-1">
                                    <span className="text-lg">🌱</span>
                                    NEW
                                </div>
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
        { name: "카페투어", icon: "☕", gradient: "from-amber-400 to-orange-400" },
        { name: "맛집탐방", icon: "🍜", gradient: "from-red-400 to-orange-500" },
        { name: "인생샷", icon: "📸", gradient: "from-green-300 to-emerald-400" },
        { name: "체험", icon: "🎯", gradient: "from-lime-400 to-green-500" },
        { name: "힐링", icon: "🌿", gradient: "from-green-400 to-emerald-500" },
        { name: "공연·전시", icon: "🏛️", gradient: "from-teal-400 to-cyan-500" },
        { name: "야경", icon: "🌃", gradient: "from-green-500 to-teal-600" },
        { name: "힙스터", icon: "🎨", gradient: "from-lime-400 to-green-500" },
        { name: "테마파크", icon: "🎢", gradient: "from-emerald-400 to-green-500" },
        { name: "핫플레이스", icon: "🔥", gradient: "from-orange-400 to-red-500" },
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
                                        className="group relative p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 block border border-green-100 hover:border-green-200"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
                                        <div className="relative text-center">
                                            <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">
                                                {concept.icon}
                                            </div>
                                            <h3 className="font-bold text-gray-800">{concept.name}</h3>
                                            <p className="text-sm text-green-600 mt-1 font-medium">
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
                            className="rounded-2xl hover:cursor-pointer w-full border border-green-200 bg-white text-gray-800 py-3 text-center hover:bg-green-50 transition-colors"
                        >
                            더 많은 컨셉 보기 ({concepts.length - 6}개 더)
                        </button>
                    </div>
                )}
                {showAll && (
                    <div className="text-center mt-8">
                        <button
                            onClick={() => setShowAll(false)}
                            className="rounded-2xl hover:cursor-pointer w-full border border-green-200 bg-white text-gray-800 py-3 text-center hover:bg-green-50 transition-colors"
                        >
                            접기
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
