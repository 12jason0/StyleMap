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
    price: string;
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
    const [coupons, setCoupons] = useState(0);
    const [showLogin, setShowLogin] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);

    const [messages, setMessages] = useState<Message[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question>(questionFlow[0]);
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
    const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [conversationStarted, setConversationStarted] = useState(false);

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
                    setUserName(userData.name || userData.email || "사용자");
                    setCoupons(parseInt(localStorage.getItem("userCoupons") || "1"));
                } catch (error) {
                    console.error("사용자 데이터 파싱 오류:", error);
                    setIsLoggedIn(false);
                    setUserName("");
                    setCoupons(0);
                }
            } else {
                setIsLoggedIn(false);
                setUserName("");
                setCoupons(0);
            }
        };

        // 초기 로그인 상태 확인
        checkLoginStatus();

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

    const handleLogin = (name: string) => {
        // 임시 로그인 처리 (실제로는 이미 카카오톡 로그인이 되어있어야 함)
        localStorage.setItem("userCoupons", "1");
        setIsLoggedIn(true);
        setUserName(name);
        setCoupons(1);
        setShowLogin(false);

        // Header 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new CustomEvent("authTokenChange"));
    };

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        localStorage.removeItem("userCoupons");
        setIsLoggedIn(false);
        setUserName("");
        setCoupons(0);
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

        setRecommendedCourses(list);
        setShowRecommendations(true);

        setMessages((prev) => [
            ...prev,
            {
                type: "ai",
                text:
                    list.length > 0
                        ? `완벽해요! 🎉 ${userName}님의 취향을 분석해 현재 데이터로 최적의 코스를 찾았어요!`
                        : `현재 조건에 딱 맞는 코스가 없어 인기 코스를 대신 추천드려요.`,
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

    const purchaseTicket = (type: string) => {
        const newCoupons = type === "basic" ? coupons + 5 : type === "premium" ? coupons + 20 : coupons + 50;
        setCoupons(newCoupons);
        localStorage.setItem("userCoupons", newCoupons.toString());
        setShowPaywall(false);
    };

    const LoginModal = () => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 relative">
                <button
                    onClick={() => setShowLogin(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-all active:scale-95"
                >
                    <XCircle className="w-6 h-6" />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">로그인하고 AI 추천받기</h2>
                    <p className="text-gray-600">로그인하면 무료 쿠폰 1개를 드려요! 🎁</p>
                </div>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="닉네임을 입력하세요"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyPress={(e) => {
                            if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                                handleLogin((e.target as HTMLInputElement).value.trim());
                            }
                        }}
                    />
                    <button
                        onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input && input.value.trim()) {
                                handleLogin(input.value.trim());
                            }
                        }}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all active:scale-95"
                    >
                        로그인하고 쿠폰받기
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
                                onClick={() => purchaseTicket("basic")}
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
                                onClick={() => purchaseTicket("premium")}
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
                                onClick={() => purchaseTicket("vip")}
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
                <p className="text-gray-600 text-sm mb-4">{course.description}</p>
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 font-sans pt-10">
            <div className="flex flex-col items-center justify-center p-4 pt-16">
                {showLogin && <LoginModal />}
                {showPaywall && <TicketPlans />}

                <div className="w-full max-w-4xl flex flex-col">
                    {/* AI 추천 헤더 */}
                    <header className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 rounded-3xl shadow-2xl p-6 sm:p-8 mb-6 flex-shrink-0">
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
                                    <p className="text-white/90 text-sm">98.7% 만족도 · 132명이 이용 중</p>
                                </div>
                            </div>

                            <div className="text-white text-right">
                                {isLoggedIn ? (
                                    <div className="flex items-center space-x-4 bg-white/10 p-2 rounded-xl">
                                        <div className="text-left">
                                            <p className="text-sm opacity-90">안녕하세요, {userName}님</p>
                                            <div className="flex items-center space-x-2">
                                                <Ticket className="w-5 h-5" />
                                                <span className="text-xl font-bold">{coupons}개</span>
                                            </div>
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
                                        className="px-6 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-all active:scale-95"
                                    >
                                        로그인하기
                                    </button>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* 채팅 및 추천 결과가 표시되는 메인 영역 */}
                    <main className="flex-1 overflow-y-auto rounded-3xl">
                        {/* 채팅 시작 버튼 */}
                        {!conversationStarted && (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white/50 rounded-3xl">
                                <button
                                    onClick={startConversation}
                                    className="cursor-pointer px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center mx-auto"
                                >
                                    <MessageCircle className="w-6 h-6 mr-3" />
                                    AI 추천 시작하기
                                </button>
                                <p className="text-gray-600 mt-4">몇 가지 질문에 답하면 완벽한 코스를 찾아드려요!</p>
                            </div>
                        )}

                        {/* 채팅 및 추천 영역 */}
                        {conversationStarted && (
                            <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 h-full flex flex-col max-h-[600px]">
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
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-200 to-pink-200 flex items-center justify-center flex-shrink-0">
                                                    <Sparkles className="w-5 h-5 text-purple-600" />
                                                </div>
                                            )}
                                            <div
                                                className={`max-w-sm px-5 py-3 rounded-2xl ${
                                                    message.type === "user"
                                                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg rounded-br-none"
                                                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                                                }`}
                                            >
                                                {message.text}
                                            </div>
                                        </div>
                                    ))}

                                    {isTyping && (
                                        <div className="flex items-end gap-2 justify-start">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-200 to-pink-200 flex items-center justify-center flex-shrink-0">
                                                <Sparkles className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div className="bg-gray-100 px-5 py-4 rounded-2xl rounded-bl-none">
                                                <div className="flex space-x-1.5">
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                                                    <div
                                                        className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"
                                                        style={{ animationDelay: "150ms" }}
                                                    ></div>
                                                    <div
                                                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
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
                                                    className="cursor-pointer px-5 py-2.5 bg-white border-2 border-purple-200 text-purple-700 rounded-full font-semibold hover:bg-purple-50 hover:border-purple-400 transition-all active:scale-95"
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
                                        className="cursor-pointer px-6 py-3 bg-white border-2 border-purple-500 text-purple-700 rounded-2xl font-bold text-base hover:bg-purple-50 transition-all transform hover:scale-105 active:scale-95 flex items-center mx-auto"
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
