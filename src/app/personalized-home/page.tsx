"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Sparkles,
    MapPin,
    Clock,
    Users,
    Star,
    Zap,
    Crown,
    Ticket,
    CheckCircle,
    XCircle,
    User,
    LogOut,
    MessageCircle,
    RefreshCw,
} from "lucide-react";

// 타입 정의
interface QuestionOption {
    text: string;
    value: string;
    next: string;
}

interface Question {
    id: string;
    type: string;
    text: string;
    options?: QuestionOption[];
}

interface Message {
    type: "ai" | "user";
    text: string;
}

interface Course {
    id: string;
    title: string;
    description: string;
    duration: string;
    location: string;
    price?: string;
    tags: string[];
    rating: number;
    reviewCount: number;
    participants: number;
    highlights: string[];
    score?: number;
}

// 질문 시나리오
const questionFlow: Question[] = [
    {
        id: "greeting",
        type: "ai",
        text: "안녕하세요! 🌟 AI가 당신의 취향을 완벽하게 분석해서 딱 맞는 여행 코스를 찾아드릴게요! 먼저 간단한 질문 몇 개만 답해주세요.",
        options: [
            { text: "네, 시작할게요! 🚀", value: "start", next: "concept" },
            { text: "어떤 질문들인지 궁금해요", value: "preview", next: "preview" },
        ],
    },
    {
        id: "preview",
        type: "ai",
        text: "총 3개의 간단한 질문을 드려요! 선호하는 콘셉트, 지역, 소요 시간을 물어볼 예정이에요. 각 질문은 30초 이내로 답하실 수 있어요 😊",
        options: [{ text: "좋아요, 시작할게요!", value: "start", next: "concept" }],
    },
    {
        id: "concept",
        type: "ai",
        text: "어떤 콘셉트를 원하시나요? 🎯 (여러 코스의 'concept' 칼럼 기준)",
        options: [
            { text: "힐링", value: "힐링", next: "region" },
            { text: "체험", value: "체험", next: "region" },
            { text: "핫플레이스", value: "핫플레이스", next: "region" },
            { text: "가성비", value: "가성비", next: "region" },
            { text: "이색데이트", value: "이색데이트", next: "region" },
            { text: "쇼핑", value: "쇼핑", next: "region" },
            { text: "카페투어", value: "카페투어", next: "region" },
            { text: "야경", value: "야경", next: "region" },
            { text: "맛집탐방", value: "맛집탐방", next: "region" },
            { text: "인생샷", value: "인생샷", next: "region" },
        ],
    },
    {
        id: "region",
        type: "ai",
        text: "어느 지역을 선호하시나요? 📍 (코스의 'region' 칼럼 기준)",
        options: [
            { text: "강남/서초", value: "서초", next: "duration" },
            { text: "성수/한남", value: "성수", next: "duration" },
            { text: "홍대/연남", value: "홍대", next: "duration" },
            { text: "종로/북촌", value: "종로", next: "duration" },
            { text: "용산", value: "용산", next: "duration" },
            { text: "여의도", value: "여의도", next: "duration" },
            { text: "신촌", value: "신촌", next: "duration" },
            { text: "영등포", value: "영등포", next: "duration" },
            { text: "가로수길", value: "가로수길", next: "duration" },
            { text: "송파/잠실", value: "송파", next: "duration" },
            { text: "강서/마곡", value: "강서구", next: "duration" },
        ],
    },
    {
        id: "duration",
        type: "ai",
        text: "예상 소요 시간은 어느 정도가 좋나요? ⏱️ (코스 'duration' 칼럼 기준)",
        options: [
            { text: "약 3시간", value: "3", next: "complete" },
            { text: "약 4시간", value: "4", next: "complete" },
            { text: "약 5시간", value: "5", next: "complete" },
            { text: "약 6시간", value: "6", next: "complete" },
        ],
    },
];

const AIRecommender = () => {
    // 상태 관리
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState("");
    const [nickname, setNickname] = useState("");
    const [coupons, setCoupons] = useState(0);
    const [showLogin, setShowLogin] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
    const [weekStamps, setWeekStamps] = useState<boolean[]>([false, false, false, false, false, false, false]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question>(questionFlow[0]);
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
    const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [conversationStarted, setConversationStarted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showUpsell, setShowUpsell] = useState(false);
    const [netError, setNetError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // 유저 정보 가져오기
    const fetchUserData = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            setIsLoggedIn(false);
            setUserName("");
            setNickname("");
            setCoupons(0);
            return;
        }

        try {
            const res = await fetch("/api/users/profile", {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });

            if (res.ok) {
                const userData = await res.json();
                setIsLoggedIn(true);
                const nick = userData.nickname || userData.name || userData.email?.split("@")[0] || "사용자";
                setUserName(nick);
                setNickname(nick);
                setCoupons(userData.couponCount || 0);
                localStorage.setItem("user", JSON.stringify(userData));
            } else {
                handleLogout();
            }
        } catch (error) {
            console.error("사용자 정보 조회 오류:", error);
            setIsLoggedIn(false);
        }
    };

    // 로그인 상태 확인
    useEffect(() => {
        const checkLoginStatus = () => {
            const token = localStorage.getItem("authToken");
            if (token) {
                fetchUserData();
            } else {
                setIsLoggedIn(false);
                setUserName("");
                setNickname("");
                setCoupons(0);
            }
        };

        checkLoginStatus();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "authToken" || e.key === "user") {
                checkLoginStatus();
            }
        };

        const handleCustomStorageChange = () => {
            checkLoginStatus();
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("authTokenChange", handleCustomStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("authTokenChange", handleCustomStorageChange);
        };
    }, []);

    // 출석 정보 가져오기
    useEffect(() => {
        if (!isLoggedIn) return;
        const fetchCheckins = async () => {
            try {
                const token = localStorage.getItem("authToken");
                if (!token) return;
                const res = await fetch("/api/users/checkins", { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) return;

                const data = await res.json();
                const list: Array<{ date: string }> = data.success ? data.checkins || [] : [];

                const now = new Date();
                const day = now.getDay();
                const mondayOffset = (day + 6) % 7;
                const monday = new Date(now);
                monday.setHours(0, 0, 0, 0);
                monday.setDate(now.getDate() - mondayOffset);

                const stamps = new Array(7).fill(false) as boolean[];
                for (const c of list) {
                    const d = new Date(c.date);
                    for (let i = 0; i < 7; i++) {
                        const dt = new Date(monday);
                        dt.setDate(monday.getDate() + i);
                        if (
                            d.getFullYear() === dt.getFullYear() &&
                            d.getMonth() === dt.getMonth() &&
                            d.getDate() === dt.getDate()
                        ) {
                            stamps[i] = true;
                        }
                    }
                }
                setWeekStamps(stamps);

                const todayStamp = stamps[(day + 6) % 7];
                if (!todayStamp) {
                    setAttendanceModalOpen(true);
                }
            } catch (error) {
                console.error("출석 정보 조회 오류:", error);
            }
        };

        fetchCheckins();
    }, [isLoggedIn]);

    // 출석 체크
    const doHomeCheckin = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;
            const res = await fetch("/api/users/checkins", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data?.success) {
                await fetchUserData();
                const now = new Date();
                const day = now.getDay();
                const idx = (day + 6) % 7;
                setWeekStamps((prev) => prev.map((v, i) => (i === idx ? true : v)));
                setAttendanceModalOpen(false);

                if (data.awarded) {
                    alert(`출석 7회 달성! 쿠폰 ${data.rewardAmount || 1}개가 지급되었습니다.`);
                } else {
                    alert("출석 체크 완료!");
                }
            } else {
                alert(data.message || "출석 체크에 실패했습니다.");
            }
        } catch (error) {
            console.error("출석 체크 API 오류:", error);
            alert("오류가 발생했습니다. 다시 시도해주세요.");
        }
    };

    // 로그아웃
    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
        setUserName("");
        setNickname("");
        setCoupons(0);
        resetConversation();
        setConversationStarted(false);
        window.dispatchEvent(new CustomEvent("authTokenChange"));
    };

    const resetConversation = () => {
        setMessages([{ type: "ai", text: questionFlow[0].text }]);
        setCurrentQuestion(questionFlow[0]);
        setUserAnswers({});
        setRecommendedCourses([]);
        setShowRecommendations(false);
        setProgress(0);
        setShowUpsell(false);
        setIsGenerating(false);
    };

    const startConversation = () => {
        if (!conversationStarted) {
            setMessages([{ type: "ai", text: currentQuestion.text }]);
            setConversationStarted(true);
        }
    };

    // 쿠폰 사용 API
    const useCoupon = async (): Promise<boolean> => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            setShowLogin(true);
            return false;
        }

        try {
            const response = await fetch("/api/ai-recommendation/use-ticket", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setCoupons(data.ticketsRemaining);
                return true;
            } else {
                const errorData = await response.json();
                if (response.status === 400) {
                    setShowPaywall(true);
                } else {
                    alert(errorData.message || "쿠폰 사용 오류");
                    setNetError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
                }
                return false;
            }
        } catch (error) {
            console.error("쿠폰 사용 API 오류:", error);
            alert("네트워크 오류");
            setNetError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            return false;
        }
    };

    // 쿠폰 환불 API
    const refundCoupon = async (): Promise<void> => {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        try {
            const response = await fetch("/api/ai-recommendation/refund", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setCoupons(data.ticketsRemaining);
            } else {
                setNetError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            }
        } catch (error) {
            console.error("쿠폰 환불 API 오류:", error);
            setNetError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    // 답변 처리
    const handleAnswer = async (option: QuestionOption) => {
        const isFirstAnswer = Object.keys(userAnswers).length === 0;

        if (isFirstAnswer) {
            if (!isLoggedIn) {
                setShowLogin(true);
                return;
            }
            if (coupons < 1) {
                setShowPaywall(true);
                return;
            }
            const couponUsed = await useCoupon();
            if (!couponUsed) {
                return;
            }
        }

        setMessages((prev) => [...prev, { type: "user", text: option.text }]);

        const newAnswers = { ...userAnswers, [currentQuestion.id]: option.value };
        setUserAnswers(newAnswers);

        setIsTyping(true);

        setTimeout(async () => {
            setIsTyping(false);

            const progressKeys = ["concept", "region", "duration"];
            const answered = Object.keys(newAnswers).filter((k) => progressKeys.includes(k)).length;
            const totalSteps = 3;
            const pct = Math.min(100, Math.round((answered / totalSteps) * 100));
            setProgress(pct);
            setShowUpsell(pct >= 75 && pct < 100);

            if (option.next === "complete") {
                setShowRecommendations(true);
                setIsGenerating(true);
                await generateRecommendations(newAnswers);
                setIsGenerating(false);
            } else {
                const nextQuestion = questionFlow.find((q) => q.id === option.next);
                if (nextQuestion) {
                    setCurrentQuestion(nextQuestion);
                    setMessages((prev) => [...prev, { type: "ai", text: nextQuestion.text }]);
                }
            }
        }, 600);
    };

    // 추천 생성
    const generateRecommendations = async (answers: Record<string, string>) => {
        let hadNetworkError = false;
        const buildList = (rows: any[]): Course[] =>
            (rows || []).map((c: any) => ({
                id: String(c.id),
                title: c.title,
                description: c.description || "",
                duration: c.duration || "",
                location: c.location || c.region || "",
                price: c.price || "",
                tags: [],
                rating: Number(c.rating) || 0,
                reviewCount: c.reviewCount || 0,
                participants: c.participants || 0,
                highlights: c.highlights || [],
                score: c.viewCount || c.view_count || 0,
            }));

        const fetchCourses = async (query: Record<string, string>) => {
            try {
                const params = new URLSearchParams({ limit: "100", imagePolicy: "any", ...query }).toString();
                const res = await fetch(`/api/courses?${params}`, { cache: "no-store" });
                if (!res.ok) {
                    hadNetworkError = true;
                    return [] as Course[];
                }
                const data = await res.json().catch(() => {
                    hadNetworkError = true;
                    return [];
                });
                if (!Array.isArray(data)) return [] as Course[];
                return buildList(data);
            } catch {
                hadNetworkError = true;
                return [] as Course[];
            }
        };

        const wantsConcept = answers.concept || "";
        const wantsRegion = answers.region || "";
        const wantsDuration = answers.duration || "";

        let list = await fetchCourses({
            ...(wantsConcept ? { concept: wantsConcept } : {}),
            ...(wantsRegion ? { region: wantsRegion } : {}),
        });
        if (wantsDuration) {
            list = list.filter((c) => String(c.duration || "").includes(wantsDuration));
        }

        if (list.length === 0 && wantsRegion) {
            let regionOnly = await fetchCourses({ region: wantsRegion });
            if (wantsDuration) regionOnly = regionOnly.filter((c) => String(c.duration || "").includes(wantsDuration));
            list = regionOnly;
        }

        if (list.length === 0 && wantsConcept) {
            let conceptOnly = await fetchCourses({ concept: wantsConcept });
            if (wantsDuration)
                conceptOnly = conceptOnly.filter((c) => String(c.duration || "").includes(wantsDuration));
            list = conceptOnly;
        }

        list = list.slice(0, 3);

        // 결과 없거나 네트워크 오류 시 환불 및 오류 표시
        if (list.length === 0) {
            if (hadNetworkError) {
                setNetError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            }
            await refundCoupon();
        }

        setRecommendedCourses(list);
        setShowRecommendations(true);

        setMessages((prev) => [
            ...prev,
            {
                type: "ai",
                text:
                    list.length > 0
                        ? `완벽해요! 🎉 ${nickname}님의 취향을 분석해 현재 데이터로 최적의 코스를 찾았어요!`
                        : hadNetworkError
                        ? `네트워크 오류로 추천을 가져오지 못했어요. 쿠폰은 복구해드렸습니다. 잠시 후 다시 시도해 주세요.`
                        : `조건에 맞는 코스를 찾지 못했어요. 사용하신 쿠폰은 바로 복구해드렸습니다. 다른 조건으로 다시 시도해볼까요?`,
            },
        ]);
    };

    // 다른 추천
    const handleResetAndRecommend = async () => {
        if (coupons < 1) {
            setShowPaywall(true);
            return;
        }
        const couponUsed = await useCoupon();
        if (couponUsed) {
            resetConversation();
        }
    };

    // ... (결제, 모달, 카드 등 나머지 UI 컴포넌트는 기존과 동일)

    const beginPurchase = async (plan: "basic" | "premium" | "vip") => {
        // Toss Payments 결제창으로 이동 (redirect 방식)
        // orderId는 간단히 timestamp 기반으로 생성
        const orderId = `order_${plan}_${Date.now()}`;
        const amount = plan === "basic" ? 4900 : plan === "premium" ? 14900 : 29900;
        const successUrl = `${window.location.origin}/personalized-home/pay/success?orderId=${encodeURIComponent(
            orderId
        )}&amount=${amount}&plan=${plan}`;
        const failUrl = `${window.location.origin}/personalized-home/pay/fail?orderId=${encodeURIComponent(
            orderId
        )}&amount=${amount}&plan=${plan}`;

        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "";
        if (!clientKey) {
            alert("결제 설정이 완료되지 않았습니다. (NEXT_PUBLIC_TOSS_CLIENT_KEY)");
            return;
        }
        const params = new URLSearchParams({
            clientKey,
            amount: String(amount),
            orderId,
            orderName:
                plan === "basic" ? "AI 추천 쿠폰 5개" : plan === "premium" ? "AI 추천 쿠폰 20개" : "AI 추천 쿠폰 50개",
            successUrl,
            failUrl,
        }).toString();
        window.location.href = `https://tosspayments.com/payments/checkout?${params}`;
    };

    const LoginModal = () => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 relative">
                <button
                    onClick={() => setShowLogin(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-all active:scale-95 hover:cursor-pointer"
                >
                    <XCircle className="w-6 h-6" />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-600">로그인하고 AI 추천받기</h2>
                    <p className="text-gray-600">로그인하면 무료 쿠폰 1개를 드려요! 🎁</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => {
                            window.location.href = "/login";
                        }}
                        className="hover:cursor-pointer w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all active:scale-95"
                    >
                        로그인 하러 가기
                    </button>
                </div>

                <div className="mt-6 p-4 bg-purple-50 rounded-xl">
                    <h4 className="font-semibold text-purple-800 mb-2">로그인 혜택</h4>
                    <ul className="text-sm text-purple-600 space-y-1">
                        <li className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-purple-500" />
                            AI 추천 무료 쿠폰 1개
                        </li>
                        <li className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-purple-500" />
                            개인 맞춤 추천 서비스
                        </li>
                        <li className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-purple-500" />
                            코스 예약 할인 혜택
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );

    const TicketPlans = () => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="relative bg-gradient-to-br from-purple-600 via-pink-500 to-blue-600 p-8 rounded-t-3xl">
                    <button
                        onClick={() => setShowPaywall(false)}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-all active:scale-95"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>

                    <div className="text-center text-white">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-full mb-4">
                            <Ticket className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">AI 추천 쿠폰</h2>
                        <p className="text-white/90">쿠폰이 부족해요! 더 많은 추천을 받으려면 쿠폰을 구매하세요</p>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Basic */}
                        <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-purple-300 transition-all flex flex-col">
                            <h3 className="text-xl font-bold mb-2">Basic</h3>
                            <div className="mb-4">
                                <span className="text-3xl font-bold">₩4,900</span>
                            </div>
                            <div className="text-center mb-4">
                                <span className="text-4xl font-bold text-purple-600">5개</span>
                                <p className="text-gray-600">쿠폰</p>
                            </div>
                            <ul className="space-y-3 mb-6 flex-grow">
                                <li className="flex items-start">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm">AI 추천 5회 이용</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm">5% 코스 할인</span>
                                </li>
                            </ul>
                            <button
                                onClick={() => beginPurchase("basic")}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-all active:scale-95"
                            >
                                구매하기
                            </button>
                        </div>

                        {/* Premium */}
                        <div className="border-2 border-purple-500 rounded-2xl p-6 relative transform md:scale-105 shadow-xl flex flex-col">
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                                    BEST VALUE
                                </span>
                            </div>
                            <h3 className="text-xl font-bold mb-2 flex items-center">
                                Premium <Crown className="w-5 h-5 text-yellow-500 ml-2" />
                            </h3>
                            <div className="mb-4">
                                <span className="text-3xl font-bold">₩14,900</span>
                            </div>
                            <div className="text-center mb-4">
                                <span className="text-4xl font-bold text-purple-600">20개</span>
                                <p className="text-gray-600">쿠폰</p>
                            </div>
                            <ul className="space-y-3 mb-6 flex-grow">
                                <li className="flex items-start">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm">AI 추천 20회 이용</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm">15% 코스 할인</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm">우선 예약권</span>
                                </li>
                            </ul>
                            <button
                                onClick={() => beginPurchase("premium")}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all active:scale-95"
                            >
                                인기 플랜 선택
                            </button>
                        </div>

                        {/* VIP */}
                        <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-purple-300 transition-all flex flex-col">
                            <h3 className="text-xl font-bold mb-2">VIP</h3>
                            <div className="mb-4">
                                <span className="text-3xl font-bold">₩29,900</span>
                            </div>
                            <div className="text-center mb-4">
                                <span className="text-4xl font-bold text-purple-600">50개</span>
                                <p className="text-gray-600">쿠폰</p>
                            </div>
                            <ul className="space-y-3 mb-6 flex-grow">
                                <li className="flex items-start">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm">AI 추천 50회 이용</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm">30% 코스 할인</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm">VIP 전용 코스</span>
                                </li>
                            </ul>
                            <button
                                onClick={() => beginPurchase("vip")}
                                className="w-full py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all active:scale-95"
                            >
                                VIP 되기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const CourseCard = ({ course }: { course: Course }) => (
        <a
            href={`/courses/${course.id}`}
            className="block bg-white rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300"
        >
            <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                <p
                    className="text-gray-600 text-sm mb-4"
                    style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {course.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {course.highlights.map((highlight) => (
                        <span
                            key={highlight}
                            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold"
                        >
                            #{highlight}
                        </span>
                    ))}
                </div>
                <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
                    <div className="flex items-center text-gray-700">
                        <MapPin className="w-4 h-4 mr-2 text-purple-500" />
                        {course.location}
                    </div>
                    <div className="flex items-center text-gray-700">
                        <Clock className="w-4 h-4 mr-2 text-purple-500" />
                        {course.duration}
                    </div>
                    <div className="flex items-center text-gray-700">
                        <Users className="w-4 h-4 mr-2 text-purple-500" />
                        {course.participants}명 참여
                    </div>
                    <div className="flex items-center text-gray-700">
                        <Star className="w-4 h-4 mr-2 text-yellow-500" />
                        <strong>{course.rating}</strong>
                        <span className="text-gray-500 ml-1">({course.reviewCount}개 리뷰)</span>
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                <span className="text-xl font-bold text-purple-600">{course.price}</span>
                <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-md transition-all">
                    자세히 보기
                </span>
            </div>
        </a>
    );

    return (
        <div className="min-h-screen bg-white font-sans ">
            <div className="flex flex-col items-center justify-center p-4 ">
                {showLogin && <LoginModal />}
                {showPaywall && <TicketPlans />}
                {attendanceModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">출석 체크</h3>
                            <p className="text-gray-600 mb-4">이번 주 출석 현황</p>
                            <div className="grid grid-cols-7 gap-2 mb-4">
                                {["월", "화", "수", "목", "금", "토", "일"].map((label, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        <span className="text-xs text-gray-500">{label}</span>
                                        <span
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                                weekStamps[i] ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
                                            }`}
                                        >
                                            {weekStamps[i] ? "✔" : ""}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setAttendanceModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-gray-700"
                                >
                                    나중에
                                </button>
                                <button
                                    onClick={doHomeCheckin}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                                >
                                    출석 체크 하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="w-full max-w-4xl flex flex-col">
                    {/* AI 추천 헤더 */}
                    <header className="bg-[#1E2A44] rounded-3xl shadow-2xl p-6 sm:p-8 mb-6 flex-shrink-0 border border-white/10">
                        <div className="flex flex-col justify-between gap-4">
                            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                <div className="relative">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                                        <Sparkles className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-purple-300">
                                        <Zap className="w-4 h-4 text-black" />
                                    </div>
                                </div>
                                <div className="text-white">
                                    <h1 className="font-brand text-2xl sm:text-3xl font-bold cursor-pointer">
                                        AI 여행 코스 추천
                                    </h1>
                                    <p className="text-white/90 text-sm font-brand">98.7% 만족도 · 32명이 이용 중</p>
                                </div>
                            </div>

                            <div className="text-white w-full flex justify-end items-end">
                                {isLoggedIn ? (
                                    <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl backdrop-blur-sm w-full lg:w-auto justify-between lg:justify-start">
                                        <div className="text-left min-w-0">
                                            <p className="text-sm opacity-90 whitespace-nowrap truncate">
                                                안녕하세요, {nickname && nickname.trim() ? nickname : "사용자"}님
                                            </p>
                                            <div className="flex items-center space-x-2 whitespace-nowrap">
                                                <Ticket className="w-5 h-5" />
                                                <span className="text-xl font-bold">{coupons}개</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="p-2.5 bg-white/20 rounded-lg hover:bg-white/30 transition-all active:scale-95 cursor-pointer"
                                        >
                                            <LogOut className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowLogin(true)}
                                        className="hover:cursor-pointer px-6 py-3 bg-white/15 text-white rounded-xl font-semibold hover:bg-white/25 transition-all active:scale-95 w-full lg:w-auto"
                                    >
                                        로그인하기
                                    </button>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* 채팅 및 추천 결과가 표시되는 메인 영역 */}
                    <main className="flex-1 overflow-y-auto rounded-3xl">
                        {conversationStarted && !showRecommendations && (
                            <div className="sticky top-0 z-10 p-3">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-600">
                                    {[0, 25, 50, 75, 100].map((v) => (
                                        <span
                                            key={v}
                                            className={`inline-block w-2 h-2 rounded-full ${
                                                progress >= v ? "bg-purple-600" : "bg-gray-300"
                                            }`}
                                        />
                                    ))}
                                    <span className="ml-2">{progress}%</span>
                                </div>
                            </div>
                        )}
                        {!conversationStarted && (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white/10 rounded-3xl border border-white/10">
                                <button
                                    onClick={startConversation}
                                    className="cursor-pointer px-8 py-4 bg-[#2A3B5F] text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center mx-auto"
                                >
                                    <MessageCircle className="w-6 h-6 mr-3" />
                                    AI 추천 시작하기
                                </button>
                                <p className="text-gray-600 mt-4">몇 가지 질문에 답하면 </p>
                                <p className="text-gray-600">완벽한 코스를 찾아드려요!</p>
                                <div className="mt-6 text-sm text-gray-700 bg-gray-50 rounded-xl p-4">
                                    <p>
                                        시작하면 <strong>콘셉트/지역/시간</strong>을 바탕으로
                                        <strong> 3시간짜리 맞춤 데이트 코스</strong>를 만드는 중이에요 🎉
                                    </p>
                                </div>
                            </div>
                        )}

                        {conversationStarted && (
                            <div className="bg-white/95 rounded-3xl shadow-xl p-4 sm:p-6 h-full flex flex-col max-h-[600px]">
                                {showUpsell && !showRecommendations && (
                                    <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-pink-50 border border-amber-200 text-[13px] text-gray-800">
                                        <div className="font-semibold mb-1">
                                            🔑 AI 추천 {coupons <= 1 ? "1회 남음" : `${coupons}개 남음`}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span>프리미엄으로 업그레이드하면 무제한 추천!</span>
                                            <button
                                                onClick={() => setShowPaywall(true)}
                                                className="px-2 py-1 rounded-lg bg-black text-white text-xs cursor-pointer"
                                            >
                                                업그레이드
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                                    {messages.map((message, index) => (
                                        <div
                                            key={index}
                                            className={`flex items-end gap-2 ${
                                                message.type === "user" ? "justify-end" : "justify-start"
                                            }`}
                                        >
                                            {message.type === "ai" && (
                                                <div className="w-8 h-8 rounded-full bg-[#1E2A44] text-white flex items-center justify-center flex-shrink-0">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div
                                                className={`max-w-sm px-5 py-3 rounded-2xl ${
                                                    message.type === "user"
                                                        ? "bg-[#2A3B5F] text-white shadow-lg rounded-br-none"
                                                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                                                }`}
                                            >
                                                {message.text}
                                            </div>
                                        </div>
                                    ))}

                                    {isTyping && (
                                        <div className="flex items-end gap-2 justify-start">
                                            <div className="w-8 h-8 rounded-full bg-[#1E2A44] text-white flex items-center justify-center flex-shrink-0">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div className="bg-gray-100 px-5 py-4 rounded-2xl rounded-bl-none">
                                                <div className="flex space-x-1.5">
                                                    <div className="w-2 h-2 bg-[#2A3B5F] rounded-full animate-bounce"></div>
                                                    <div
                                                        className="w-2 h-2 bg-[#3E548C] rounded-full animate-bounce"
                                                        style={{ animationDelay: "150ms" }}
                                                    ></div>
                                                    <div
                                                        className="w-2 h-2 bg-[#6B84C3] rounded-full animate-bounce"
                                                        style={{ animationDelay: "300ms" }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {!isTyping && !showRecommendations && currentQuestion.options && (
                                    <div className="flex-shrink-0 border-t border-gray-100 mt-4 pt-4">
                                        <div className="flex flex-wrap gap-3">
                                            {currentQuestion.options.map((option, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleAnswer(option)}
                                                    className="cursor-pointer px-5 py-2.5 bg-white/90 border-2 border-[#2A3B5F]/30 text-[#1E2A44] rounded-full font-semibold hover:bg-white transition-all active:scale-95"
                                                >
                                                    {option.text}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {showRecommendations && (
                            <div className="overflow-y-auto h-full text-black">
                                {isGenerating ? (
                                    <div className="py-16 text-center text-gray-600">맞춤 코스를 생성 중입니다...</div>
                                ) : recommendedCourses.length > 0 ? (
                                    <>
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 p-2">
                                            {recommendedCourses.map((course) => (
                                                <CourseCard key={course.id} course={course} />
                                            ))}
                                        </div>
                                        <div className="text-center pb-6">
                                            <button
                                                onClick={handleResetAndRecommend}
                                                className="cursor-pointer px-6 py-3 bg-white border-2 border-[#2A3B5F] text-[#1E2A44] rounded-2xl font-bold text-base hover:bg-white transition-all transform hover:scale-105 active:scale-95 flex items-center mx-auto"
                                            >
                                                <RefreshCw className="w-5 h-5 mr-2" />
                                                다른 추천 받기 (쿠폰 1개 사용)
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-16 text-center text-gray-700">
                                        조건에 맞는 코스를 찾지 못했어요. 사용하신 쿠폰은 복구되었습니다.
                                        <div className="mt-4">
                                            <button
                                                onClick={resetConversation}
                                                className="cursor-pointer px-6 py-3 bg-white border-2 border-[#2A3B5F] text-[#1E2A44] rounded-2xl font-bold text-base"
                                            >
                                                다른 조건으로 다시 시도
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
            <div className="md:hidden h-20"></div>
        </div>
    );
};

export default AIRecommender;
