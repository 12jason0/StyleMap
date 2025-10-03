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
            { text: "네, 시작할게요! 🚀", value: "start", next: "mood" },
            { text: "어떤 질문들인지 궁금해요", value: "preview", next: "preview" },
        ],
    },
    {
        id: "preview",
        type: "ai",
        text: "총 4-5개의 간단한 질문을 드려요! 현재 기분, 선호하는 활동, 지역, 예산 등을 물어볼 예정이에요. 각 질문은 30초 이내로 답하실 수 있어요 😊",
        options: [{ text: "좋아요, 시작할게요!", value: "start", next: "mood" }],
    },
    {
        id: "mood",
        type: "ai",
        text: "오늘은 어떤 기분이신가요? 🎭",
        options: [
            { text: "활력이 넘쳐요! 🔥", value: "energetic", next: "activity" },
            { text: "편안한 휴식이 필요해요 😌", value: "relaxed", next: "activity" },
            { text: "새로운 것을 발견하고 싶어요 ✨", value: "adventurous", next: "activity" },
            { text: "맛있는 걸 먹고 싶어요 🍽️", value: "foodie", next: "location" },
        ],
    },
    {
        id: "activity",
        type: "ai",
        text: "어떤 활동을 선호하시나요?",
        options: [
            { text: "카페 & 디저트 투어 ☕", value: "cafe", next: "location" },
            { text: "쇼핑 & 패션 탐방 🛍️", value: "shopping", next: "location" },
            { text: "문화 & 예술 체험 🎨", value: "culture", next: "location" },
            { text: "자연 & 공원 산책 🌳", value: "nature", next: "location" },
        ],
    },
    {
        id: "location",
        type: "ai",
        text: "어느 지역을 선호하시나요? 📍",
        options: [
            { text: "강남/서초 (트렌디한 핫플)", value: "gangnam", next: "budget" },
            { text: "성수/한남 (감성 카페)", value: "seongsu", next: "budget" },
            { text: "홍대/연남 (젊은 문화)", value: "hongdae", next: "budget" },
            { text: "종로/북촌 (전통과 현대)", value: "jongno", next: "budget" },
        ],
    },
    {
        id: "budget",
        type: "ai",
        text: "예산은 어느 정도 생각하고 계신가요? 💰",
        options: [
            { text: "3-5만원", value: "30-50", next: "complete" },
            { text: "5-8만원", value: "50-80", next: "complete" },
            { text: "8만원 이상", value: "80+", next: "complete" },
            { text: "상관없어요", value: "any", next: "complete" },
        ],
    },
];

// 더미 allCourses 제거: DB에서 조건에 맞는 코스 추천을 가져옵니다.

const AIRecommender = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState("");
    const [nickname, setNickname] = useState("");
    const [coupons, setCoupons] = useState(0);
    const [coins, setCoins] = useState(0);
    const [showLogin, setShowLogin] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
    const [attendanceCount, setAttendanceCount] = useState(0);

    const [messages, setMessages] = useState<Message[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question>(questionFlow[0]);
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
    const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [conversationStarted, setConversationStarted] = useState(false);
    const [progress, setProgress] = useState(0); // 0~100 진행도
    const [showUpsell, setShowUpsell] = useState(false); // 최종 전 업셀 표시

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // 로그인 상태 확인
    useEffect(() => {
        const checkLoginStatus = () => {
            const token = localStorage.getItem("authToken");
            const user = localStorage.getItem("user");

            if (token && user) {
                try {
                    const userData = JSON.parse(user);
                    setIsLoggedIn(true);
                    // 닉네임 우선, 없으면 name, 둘 다 없으면 email의 로컬파트 또는 '사용자'
                    const emailLocal = typeof userData.email === "string" ? userData.email.split("@")[0] : "";
                    let nick = userData.nickname || userData.name || emailLocal || "사용자";
                    try {
                        if (!userData.nickname && nick) {
                            const patched = { ...userData, nickname: nick };
                            localStorage.setItem("user", JSON.stringify(patched));
                        }
                    } catch {}
                    setUserName(nick);
                    setNickname(nick);
                    setCoupons(parseInt(localStorage.getItem("userCoupons") || "1"));
                    setCoins(parseInt(localStorage.getItem("userCoins") || "0"));
                    // 출석 카운트 초기화
                    try {
                        const c = parseInt(localStorage.getItem("attendanceCount") || "0");
                        setAttendanceCount(Number.isFinite(c) ? c : 0);
                    } catch {}
                } catch (error) {
                    console.error("사용자 데이터 파싱 오류:", error);
                    setIsLoggedIn(false);
                    setUserName("");
                    setNickname("");
                    setCoupons(0);
                }
            } else {
                setIsLoggedIn(false);
                setUserName("");
                setNickname("");
                setCoupons(0);
                setCoins(0);
            }
        };

        // 초기 로그인 상태 확인
        checkLoginStatus();
        // 세션에서 닉네임 최신화(로컬 user에 nickname이 없을 수 있음)
        (async () => {
            try {
                const res = await fetch("/api/auth/session", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    const sessNick = data?.user?.nickname || data?.user?.name || "";
                    if (sessNick) {
                        setNickname(sessNick);
                        setUserName(sessNick);
                        // 로컬 user 동기화
                        try {
                            const userStr = localStorage.getItem("user");
                            if (userStr) {
                                const parsed = JSON.parse(userStr);
                                if (!parsed.nickname || parsed.nickname !== sessNick) {
                                    localStorage.setItem("user", JSON.stringify({ ...parsed, nickname: sessNick }));
                                }
                            }
                        } catch {}
                    }
                }
            } catch {}
        })();

        // localStorage 변경 감지를 위한 이벤트 리스너
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "authToken" || e.key === "user") {
                checkLoginStatus();
            }
        };

        // 커스텀 이벤트 리스너 (같은 탭에서의 변경 감지)
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

    // 로그인 시, 오늘 출석 여부 확인하여 모달 띄우기
    useEffect(() => {
        if (!isLoggedIn) return;
        try {
            const last = localStorage.getItem("attendanceLastDate") || "";
            const today = new Date().toISOString().slice(0, 10);
            if (last !== today) setAttendanceModalOpen(true);
        } catch {}
    }, [isLoggedIn]);

    const handleAttendanceCheck = () => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const last = localStorage.getItem("attendanceLastDate") || "";
            if (last === today) {
                setAttendanceModalOpen(false);
                return;
            }
            const next = attendanceCount + 1;
            setAttendanceCount(next);
            localStorage.setItem("attendanceCount", String(next));
            localStorage.setItem("attendanceLastDate", today);
            setAttendanceModalOpen(false);
            if (next % 7 === 0) {
                const nc = coupons + 7;
                setCoupons(nc);
                localStorage.setItem("userCoupons", String(nc));
                alert("출석 7회 달성! 쿠폰 7개가 지급되었어요.");
            } else {
                const remain = 7 - (next % 7);
                alert(`출석 완료! 남은 횟수 ${remain}회 (7회마다 쿠폰 7개 지급)`);
            }
        } catch {
            setAttendanceModalOpen(false);
        }
    };

    const handleLogin = (name: string) => {
        // 임시 로그인 처리 (실제로는 이미 카카오톡 로그인이 되어있어야 함)
        localStorage.setItem("userCoupons", "1");
        setIsLoggedIn(true);
        setUserName(name);
        setNickname(name);
        setCoupons(1);
        setShowLogin(false);

        // Header 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new CustomEvent("authTokenChange"));
    };

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        localStorage.removeItem("userCoupons");
        localStorage.removeItem("userCoins");
        setIsLoggedIn(false);
        setUserName("");
        setCoupons(0);
        setCoins(0);
        resetConversation();
        setConversationStarted(false);

        // Header 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new CustomEvent("authTokenChange"));
    };

    const resetConversation = () => {
        setMessages([{ type: "ai", text: questionFlow[0].text }]);
        setCurrentQuestion(questionFlow[0]);
        setUserAnswers({});
        setRecommendedCourses([]);
        setShowRecommendations(false);
    };

    const startConversation = () => {
        if (!conversationStarted) {
            setMessages([{ type: "ai", text: currentQuestion.text }]);
            setConversationStarted(true);
        }
    };

    const handleAnswer = (option: QuestionOption) => {
        const isFirstAnswer = Object.keys(userAnswers).length === 0;

        if (isFirstAnswer) {
            if (!isLoggedIn) {
                setShowLogin(true);
                return;
            }
            if (coupons === 0) {
                setShowPaywall(true);
                return;
            }
            const newCoupons = coupons - 1;
            setCoupons(newCoupons);
            localStorage.setItem("userCoupons", newCoupons.toString());
        }

        setMessages((prev) => [...prev, { type: "user", text: option.text }]);

        const newAnswers = { ...userAnswers, [currentQuestion.id]: option.value };
        setUserAnswers(newAnswers);

        setIsTyping(true);

        setTimeout(() => {
            setIsTyping(false);

            // 진행도 업데이트 (질문 수 기준 5단계: greeting, preview, mood, activity, location, budget, complete 중 사용자 응답 단계만)
            try {
                const answered = Object.keys(newAnswers).length;
                const totalSteps = 4; // mood, activity, location, budget
                const pct = Math.min(100, Math.round((answered / totalSteps) * 100));
                setProgress(pct);
                // 마지막 전 단계에서 업셀 배너 노출 (80% 이상)
                setShowUpsell(pct >= 75 && pct < 100);
            } catch {}

            if (option.next === "complete") {
                generateRecommendations(newAnswers);
            } else {
                const nextQuestion = questionFlow.find((q) => q.id === option.next);
                if (nextQuestion) {
                    setCurrentQuestion(nextQuestion);
                    setMessages((prev) => [...prev, { type: "ai", text: nextQuestion.text }]);
                }
            }
        }, 1000);
    };

    const generateRecommendations = async (answers: Record<string, string>) => {
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
            }));

        const tryFetch = async (query: Record<string, string>) => {
            try {
                const params = new URLSearchParams(query).toString();
                const res = await fetch(`/api/courses/recommend?${params}`, { cache: "no-store" });
                const data = await res.json();
                if (!res.ok || data.success === false) return [] as Course[];
                return buildList(data.courses || []);
            } catch {
                return [] as Course[];
            }
        };

        // 1) 원본 조건
        let list = await tryFetch({
            mood: answers.mood || "",
            activity: answers.activity || "",
            location: answers.location || "",
            budget: answers.budget || "",
        });

        // 2) 없으면 예산 제거
        if (list.length === 0) {
            list = await tryFetch({
                mood: answers.mood || "",
                activity: answers.activity || "",
                location: answers.location || "",
            });
        }

        // 지역은 항상 유지 (활동/예산만 완화). 지역까지 제거하는 폴백은 사용하지 않음.

        // 항상 3개만 표시
        list = list.slice(0, 3);

        // 결과가 없으면 쿠폰 환불
        if (list.length === 0) {
            setCoupons((prev) => {
                const restored = prev + 1;
                try {
                    localStorage.setItem("userCoupons", restored.toString());
                } catch {}
                return restored;
            });
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
                        : `조건에 맞는 코스를 찾지 못했어요. 사용하신 쿠폰은 바로 복구해드렸습니다. 다른 조건으로 다시 시도해볼까요?`,
            },
        ]);
    };

    const handleResetAndRecommend = () => {
        if (coupons === 0) {
            setShowPaywall(true);
            return;
        }
        const newCoupons = coupons - 1;
        setCoupons(newCoupons);
        localStorage.setItem("userCoupons", newCoupons.toString());
        resetConversation();
    };

    // 출석 체크: 주 1회 7코인 지급 (월요일~일요일 주간 단위)
    const checkInWeekly = () => {
        const now = new Date();
        const weekKey = `${now.getFullYear()}-W${Math.ceil(
            ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 +
                new Date(now.getFullYear(), 0, 1).getDay() +
                1) /
                7
        )}`;
        const last = localStorage.getItem("attendanceWeek");
        if (last === weekKey) return false;
        const nextCoins = coins + 7;
        setCoins(nextCoins);
        localStorage.setItem("userCoins", String(nextCoins));
        localStorage.setItem("attendanceWeek", weekKey);
        return true;
    };

    // 광고 시청: 2회당 쿠폰 1개
    const rewardAd = () => {
        const count = parseInt(localStorage.getItem("adWatchCount") || "0") + 1;
        localStorage.setItem("adWatchCount", String(count));
        if (count % 2 === 0) {
            const next = coupons + 1;
            setCoupons(next);
            localStorage.setItem("userCoupons", String(next));
            return "쿠폰 1개가 지급되었어요!";
        }
        return "광고 1회 시청 완료! 한 번 더 보면 쿠폰 1개 지급";
    };

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

        // Toss 결제 페이지로 리다이렉트 (테스트용 간소화: 카드 간편결제)
        // 실제로는 결제수단 선택 UX를 추가하거나 Checkout SDK를 붙일 수 있습니다.
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
                            try {
                                setShowLogin(false);
                            } catch {}
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
                {/* 출석 모달은 마이페이지로 이동했습니다. */}

                <div className="w-full max-w-4xl flex flex-col">
                    {/* AI 추천 헤더 */}
                    <header className="bg-[#1E2A44] rounded-3xl shadow-2xl p-6 sm:p-8 mb-6 flex-shrink-0 border border-white/10">
                        <div className="flex flex-col sm:flex-row items-center justify-between">
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
                                    <h1 className="text-2xl sm:text-3xl font-bold cursor-pointer">AI 여행 코스 추천</h1>
                                    <p className="text-white/90 text-sm">98.7% 만족도 · 32명이 이용 중</p>
                                </div>
                            </div>

                            <div className="text-white text-right">
                                {isLoggedIn ? (
                                    <div className="flex items-center space-x-4 bg-white/10 p-2 rounded-xl">
                                        <div className="text-left">
                                            <p className="text-sm opacity-90">
                                                안녕하세요, {nickname && nickname.trim() ? nickname : "사용자"}님
                                            </p>
                                            <div className="flex items-center space-x-2">
                                                <Ticket className="w-5 h-5" />
                                                <span className="text-xl font-bold">{coupons}개</span>
                                            </div>
                                            {/* 출석 표시/버튼은 마이페이지에서 확인 및 수행하세요. */}
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="p-3 bg-white/20 rounded-lg hover:bg-white/30 transition-all active:scale-95 cursor-pointer"
                                        >
                                            <LogOut className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowLogin(true)}
                                        className="hover:cursor-pointer px-6 py-3 bg-white/15 text-white rounded-xl font-semibold hover:bg-white/25 transition-all active:scale-95"
                                    >
                                        로그인하기
                                    </button>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* 채팅 및 추천 결과가 표시되는 메인 영역 */}
                    <main className="flex-1 overflow-y-auto rounded-3xl">
                        {/* 진행 상태 표시: 모바일 상단 고정 바 + 도트 */}
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
                        {/* 채팅 시작 버튼 */}
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
                                {/* 미리보기 힌트 */}
                                <div className="mt-6 text-sm text-gray-700 bg-gray-50 rounded-xl p-4">
                                    <p>
                                        시작하면 <strong>기분/활동/지역/예산</strong>을 바탕으로
                                        <strong> 3시간짜리 맞춤 데이트 코스</strong>를 만드는 중이에요 🎉
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 채팅 및 추천 영역 */}
                        {conversationStarted && (
                            <div className="bg-white/95 rounded-3xl shadow-xl p-4 sm:p-6 h-full flex flex-col max-h-[600px]">
                                {/* 업셀 배너 (마지막 전 단계에 노출) */}
                                {showUpsell && !showRecommendations && (
                                    <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-pink-50 border border-amber-200 text-[13px] text-gray-800">
                                        <div className="font-semibold mb-1">
                                            🔑 무료 체험 {coupons <= 1 ? "1회 남음" : `${coupons}개 남음`}
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
                                {/* 채팅 메시지 영역 */}
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

                                {/* 답변 선택 영역 */}
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

                        {/* 추천 결과 영역 */}
                        {showRecommendations && (
                            <div className="overflow-y-auto h-full text-black">
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
                            </div>
                        )}
                    </main>
                </div>
            </div>
            {/* 모바일 하단 네비게이션을 위한 여백 */}
            <div className="md:hidden h-20"></div>
        </div>
    );
};

export default AIRecommender;
