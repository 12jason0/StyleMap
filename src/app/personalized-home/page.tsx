"use client";

import React, { useState, useEffect, useRef } from "react";
import { fetchWeekStamps, postCheckin } from "@/lib/checkinClient";
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

// 질문 시나리오 (오늘 상황 기반)
const questionFlow: Question[] = [
    {
        id: "greeting",
        type: "ai",
        text: "안녕하세요! 🌟 오늘 당신에게 딱 맞는 코스를 찾기 위해 간단한 질문 몇 개만 답해주세요.",
        options: [
            { text: "네, 시작할게요! 🚀", value: "start", next: "goal" },
            { text: "어떤 질문들인지 궁금해요", value: "preview", next: "preview" },
        ],
    },
    {
        id: "preview",
        type: "ai",
        text: "총 4개의 간단한 질문을 드려요! 오늘의 목적, 함께하는 사람, 원하는 분위기, 선호 지역을 물어볼 예정이에요. 각 질문은 30초 이내로 답하실 수 있어요 😊",
        options: [{ text: "좋아요, 시작할게요!", value: "start", next: "goal" }],
    },
    {
        id: "goal",
        type: "ai",
        text: "Q1. 오늘의 목적은 무엇인가요? 🎯",
        options: [
            { text: "기념일", value: "기념일", next: "companion_today" },
            { text: "데이트", value: "데이트", next: "companion_today" },
            { text: "썸·소개팅", value: "썸·소개팅", next: "companion_today" },
            { text: "힐링", value: "힐링", next: "companion_today" },
            { text: "특별한 이벤트", value: "특별한 이벤트", next: "companion_today" },
            { text: "사진 잘 나오는 코스", value: "사진 잘 나오는 코스", next: "companion_today" },
            { text: "밤 데이트", value: "밤 데이트", next: "companion_today" },
        ],
    },
    {
        id: "companion_today",
        type: "ai",
        text: "Q2. 오늘 함께하는 사람은 누구인가요? 👥",
        options: [
            { text: "연인", value: "연인", next: "mood_today" },
            { text: "썸 상대", value: "썸 상대", next: "mood_today" },
            { text: "소개팅 상대", value: "소개팅 상대", next: "mood_today" },
            { text: "친구", value: "친구", next: "mood_today" },
            { text: "혼자", value: "혼자", next: "mood_today" },
        ],
    },
    {
        id: "mood_today",
        type: "ai",
        text: "Q3. 오늘 원하는 분위기는 어떤가요? ✨",
        options: [
            { text: "조용한", value: "조용한", next: "region_today" },
            { text: "감성 가득한", value: "감성 가득한", next: "region_today" },
            { text: "트렌디한", value: "트렌디한", next: "region_today" },
            { text: "활동적인", value: "활동적인", next: "region_today" },
            { text: "프리미엄", value: "프리미엄", next: "region_today" },
            { text: "사진 잘 나오는", value: "사진 잘 나오는", next: "region_today" },
            { text: "여유로운", value: "여유로운", next: "region_today" },
        ],
    },
    {
        id: "region_today",
        type: "ai",
        text: "Q4. 오늘의 선호 지역은 어디인가요? 📍",
        options: [
            { text: "성수", value: "성수", next: "payment_prompt" },
            { text: "한남", value: "한남", next: "payment_prompt" },
            { text: "홍대", value: "홍대", next: "payment_prompt" },
            { text: "강남", value: "강남", next: "payment_prompt" },
            { text: "서초", value: "서초", next: "payment_prompt" },
            { text: "여의도", value: "여의도", next: "payment_prompt" },
            { text: "종로/북촌", value: "종로/북촌", next: "payment_prompt" },
            { text: "잠실", value: "잠실", next: "payment_prompt" },
            { text: "신촌", value: "신촌", next: "payment_prompt" },
            { text: "가로수길", value: "가로수길", next: "payment_prompt" },
            { text: "이태원", value: "이태원", next: "payment_prompt" },
            { text: "압구정", value: "압구정", next: "payment_prompt" },
        ],
    },
    {
        id: "payment_prompt",
        type: "ai",
        text: "좋아요! ✨\n\n지금까지 답변을 분석해보니,\n당신에게 딱 맞는 코스를 최대 2가지로 좁힐 수 있을 것 같아요.\n\nAI 맞춤 코스 추천은\n쿠폰 1개로 이용할 수 있어요 💡\n\n계속해서 추천 받아볼까요?",
        options: [
            { text: "네, 추천 받을게요! 🎉", value: "yes", next: "complete" },
            { text: "나중에 할게요", value: "no", next: "greeting" },
        ],
    },
];

const AIRecommender = () => {
    // 상태 관리
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState("");
    const [nickname, setNickname] = useState("");
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
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
    const [isUsingCoupon, setIsUsingCoupon] = useState(false); // 쿠폰 차감 중복 방지

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
            setProfileImageUrl(null);
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
                setProfileImageUrl(userData.profileImage || userData.user?.profileImage || null);
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
                setProfileImageUrl(null);
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
                const res = await fetchWeekStamps();
                if (!res) return;
                setWeekStamps(res.stamps);
            } catch (error) {
                console.error("출석 정보 조회 오류:", error);
            }
        };

        fetchCheckins();
    }, [isLoggedIn]);

    // 출석 체크
    const doHomeCheckin = async () => {
        try {
            const result = await postCheckin();
            if (result.ok && result.success) {
                await fetchUserData();
                // 서버가 내려준 todayIndex가 있으면 그 위치만 true로 반영 (KST 기준 안전)
                if (typeof result.todayIndex === "number") {
                    setWeekStamps((prev) => prev.map((v, i) => (i === result.todayIndex ? true : v)));
                } else {
                    const now = new Date();
                    const day = now.getDay();
                    const idx = (day + 6) % 7;
                    setWeekStamps((prev) => prev.map((v, i) => (i === idx ? true : v)));
                }
                setAttendanceModalOpen(false);

                if (result.awarded) {
                    alert(`출석 7회 달성! 쿠폰 ${result.rewardAmount || 1}개가 지급되었습니다.`);
                } else {
                    alert("출석 체크 완료!");
                }
            } else {
                alert("출석 체크에 실패했습니다.");
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
        setProfileImageUrl(null);
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

    // 쿠폰 사용 API (중복 차감 방지)
    const useCoupon = async (): Promise<boolean> => {
        // 이미 쿠폰 차감 중이면 중복 차감 방지
        if (isUsingCoupon) {
            console.log("쿠폰 차감이 이미 진행 중입니다.");
            return false;
        }

        const token = localStorage.getItem("authToken");
        if (!token) {
            setShowLogin(true);
            return false;
        }

        setIsUsingCoupon(true); // 쿠폰 차감 시작 플래그 설정

        try {
            const response = await fetch("/api/ai-recommendation/use-ticket", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setCoupons(data.ticketsRemaining);
                setIsUsingCoupon(false); // 쿠폰 차감 완료
                return true;
            } else {
                const errorData = await response.json();
                setIsUsingCoupon(false); // 쿠폰 차감 실패
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
            setIsUsingCoupon(false); // 쿠폰 차감 실패
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
        // payment_prompt에서 "yes"를 선택하면 쿠폰 차감 및 추천 생성
        if (currentQuestion.id === "payment_prompt") {
            if (option.value === "yes") {
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

                setMessages((prev) => [...prev, { type: "user", text: option.text }]);
                setIsTyping(true);
                setIsGenerating(true);
                setShowRecommendations(true);

                setTimeout(async () => {
                    setIsTyping(false);
                    await generateRecommendations(userAnswers);
                    setIsGenerating(false);
                }, 600);
                return;
            } else if (option.value === "no") {
                // 나중에 할게요 선택 시 대화 초기화
                resetConversation();
                return;
            }
        }

        // 첫 답변 시 로그인/쿠폰 체크는 하지 않음 (payment_prompt에서 처리)
        setMessages((prev) => [...prev, { type: "user", text: option.text }]);

        const newAnswers = { ...userAnswers, [currentQuestion.id]: option.value };
        setUserAnswers(newAnswers);

        setIsTyping(true);

        setTimeout(async () => {
            setIsTyping(false);

            // 진행률 계산 (goal, companion_today, mood_today, region_today)
            const progressKeys = ["goal", "companion_today", "mood_today", "region_today"];
            const answered = Object.keys(newAnswers).filter((k) => progressKeys.includes(k)).length;
            const totalSteps = 4;
            const pct = Math.min(100, Math.round((answered / totalSteps) * 100));
            setProgress(pct);

            // complete로 가면 추천 생성 (payment_prompt에서 처리하므로 여기서는 처리 안 함)
            if (option.next === "complete") {
                // 이미 payment_prompt에서 처리됨
                return;
            }

            const nextQuestion = questionFlow.find((q) => q.id === option.next);
            if (nextQuestion) {
                setCurrentQuestion(nextQuestion);
                setMessages((prev) => [...prev, { type: "ai", text: nextQuestion.text }]);
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

        // 새로운 질문 구조에 맞게 추천 API 호출
        const goal = answers.goal || "";
        const companionToday = answers.companion_today || "";
        const moodToday = answers.mood_today || "";
        const regionToday = answers.region_today || "";

        let list: Course[] = [];

        // 추천 API 호출 (새로운 알고리즘 사용)
        try {
            const token = localStorage.getItem("authToken");
            const params = new URLSearchParams({
                goal,
                companion_today: companionToday,
                mood_today: moodToday,
                region_today: regionToday,
                limit: "2",
            }).toString();

            const res = await fetch(`/api/recommendations?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                cache: "no-store",
            });

            if (res.ok) {
                const data = await res.json();
                if (data.recommendations && Array.isArray(data.recommendations)) {
                    list = buildList(data.recommendations);
                }
            }
        } catch (error) {
            console.error("추천 API 오류:", error);
            hadNetworkError = true;
        }

        // 폴백: 기존 방식으로 필터링
        if (list.length === 0) {
            let fallbackList = await fetchCourses({
                ...(regionToday ? { region: regionToday } : {}),
            });
            list = fallbackList.slice(0, 2);
        }

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
                        ? `완벽해요! 🎉 ${nickname}님의 취향을 분석해 ${
                              list.length === 1 ? "1가지" : "2가지"
                          } 코스를 찾았어요!`
                        : hadNetworkError
                        ? `네트워크 오류로 추천을 가져오지 못했어요. 쿠폰은 복구해드렸습니다. 잠시 후 다시 시도해 주세요.`
                        : `조건에 맞는 코스를 찾지 못했어요. 사용하신 쿠폰은 바로 복구해드렸습니다. 다른 조건으로 다시 시도해볼까요?`,
            },
        ]);
    };

    // 다른 추천 (쿠폰 차감 없이 재시작)
    const handleResetAndRecommend = async () => {
        resetConversation();
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
                    <p className="text-gray-600">로그인하면 무료 쿠폰 2개를 드려요! 🎁</p>
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
                            AI 추천 무료 쿠폰 2개
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
                    {/* AI 추천 헤더 - 이미지 스타일 */}
                    <div className="flex flex-col gap-4 mb-6">
                        {/* 상단 카드: AI 추천 카드 */}
                        <div className="bg-white rounded-2xl shadow-lg p-6 flex-shrink-0">
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                        <img
                                            src="https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/logo/donalogo_512.png"
                                            alt="DoNa"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h1 className="text-2xl font-bold text-black mb-1">두나의 AI 코스 추천</h1>
                                    <p className="text-sm text-gray-500">98.7% 만족도 · 32명 사용 중</p>
                                </div>
                            </div>
                            <button
                                onClick={startConversation}
                                className="w-full bg-gray-100 hover:bg-gray-200 rounded-xl py-3 px-4 flex items-center justify-center text-black font-medium transition-all active:scale-95"
                            >
                                <span>AI 추천 시작하기</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="ml-2"
                                >
                                    <path d="m9 18 6-6-6-6" />
                                </svg>
                            </button>
                        </div>

                        {/* 하단 카드: 사용자 정보 카드 */}
                        <div className="bg-white rounded-2xl shadow-lg p-6 flex-shrink-0">
                            {isLoggedIn ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                            <img
                                                src={
                                                    profileImageUrl ||
                                                    "https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/profileLogo.png"
                                                }
                                                alt={nickname || "사용자"}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-base font-medium text-black">
                                                안녕하세요, {nickname && nickname.trim() ? nickname : "사용자"}님
                                            </p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <Ticket className="w-5 h-5 text-gray-400" />
                                                <span className="text-lg font-bold text-black">쿠폰 {coupons}개</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
                                    >
                                        <LogOut className="w-5 h-5 text-gray-600" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                            <img
                                                src="https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/profileLogo.png"
                                                alt="기본 프로필"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-base font-medium text-black">로그인이 필요해요</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                로그인하면 무료 쿠폰 2개를 드려요! 🎁
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowLogin(true)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all active:scale-95 text-sm font-semibold"
                                    >
                                        로그인
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

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
                                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                                    <img
                                                        src="https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/logo/donalogo_512.png"
                                                        alt="DoNa"
                                                        className="w-full h-full object-cover"
                                                    />
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
                                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                                <img
                                                    src="https://stylemap-seoul.s3.ap-northeast-2.amazonaws.com/logo/donalogo_512.png"
                                                    alt="DoNa"
                                                    className="w-full h-full object-cover"
                                                />
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
                                                다른 추천 받기
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
