"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserPreferences {
    travelStyle: string[];
    budgetRange: string;
    timePreference: string[];
    foodPreference: string[];
    activityLevel: string;
    groupSize: string;
    interests: string[];
    ageGroup: string;
    locationPreferences: string[];
}

const AIOnboarding = () => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [preferences, setPreferences] = useState<UserPreferences>({
        travelStyle: [],
        budgetRange: "",
        timePreference: [],
        foodPreference: [],
        activityLevel: "",
        groupSize: "",
        interests: [],
        ageGroup: "",
        locationPreferences: [],
    });

    const totalSteps = 8;

    // 전체 화면 고정: 온보딩 동안 스크롤 제거 및 높이 고정
    useEffect(() => {
        try {
            const mainEl = document.querySelector("main") as HTMLElement | null;
            if (!mainEl) return;
            const previousClassName = mainEl.className;
            const previousStyle = { overflow: mainEl.style.overflow, height: mainEl.style.height } as const;
            mainEl.classList.remove("overflow-y-auto", "overscroll-contain", "no-scrollbar", "scrollbar-hide");
            mainEl.classList.add("overflow-hidden");
            if (!mainEl.style.height) mainEl.style.height = "100vh";
            return () => {
                try {
                    mainEl.className = previousClassName;
                    mainEl.style.overflow = previousStyle.overflow;
                    mainEl.style.height = previousStyle.height;
                } catch {}
            };
        } catch {}
    }, []);

    const handleMultiSelect = (key: keyof UserPreferences, value: string) => {
        const currentValues = preferences[key] as string[];
        const newValues = currentValues.includes(value)
            ? currentValues.filter((v) => v !== value)
            : [...currentValues, value];

        setPreferences({ ...preferences, [key]: newValues });
    };

    const handleSingleSelect = (key: keyof UserPreferences, value: string) => {
        setPreferences({ ...preferences, [key]: value });
    };

    const nextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                router.push("/login");
                return;
            }

            const response = await fetch("/api/users/preferences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    preferences,
                }),
            });

            if (response.ok) {
                router.push("/");
            } else {
                console.error("Failed to save preferences");
            }
        } catch (error) {
            console.error("Failed to save preferences:", error);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="text-center text-black">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">🎯</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            나만의 여행 스타일을 찾아보세요
                        </h2>
                        <p className="text-black mb-6 md:mb-8">
                            몇 가지 질문에 답해주시면, AI가 당신에게 완벽한 코스를 추천해드려요
                        </p>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-4">
                            {["힐링 & 휴식", "액티브한 모험", "문화 탐방", "맛집 투어", "쇼핑"].map(
                                (style) => (
                                    <button
                                        key={style}
                                        onClick={() => handleMultiSelect("travelStyle", style)}
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                            preferences.travelStyle.includes(style)
                                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        {style}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="text-center">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">💰</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            예산은 어느 정도 생각하고 계신가요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">1인 기준 하루 예산을 선택해주세요</p>

                        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                            {[
                                { value: "budget", label: "5만원 미만", desc: "가성비 위주" },
                                { value: "moderate", label: "5 ~ 10만원", desc: "적당한 수준" },
                                { value: "premium", label: "10 ~ 20만원", desc: "프리미엄 경험" },
                                { value: "luxury", label: "20만원 이상", label2: "럭셔리 여행" },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleSingleSelect("budgetRange", option.value)}
                                    className={`p-6 rounded-xl border-2 transition-all text-left cursor-pointer text-black min-w-0 ${
                                        preferences.budgetRange === option.value
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="font-bold text-base md:text-lg text-black truncate">
                                        {option.label}
                                    </div>
                                    <div className="text-gray-500 text-xs md:text-sm truncate">
                                        {option.desc || option.label2}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="text-center">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">⏰</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            언제 여행하는 걸 선호하시나요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">선호하는 시간대를 모두 선택해주세요</p>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-4">
                            {[
                                { value: "morning", label: "오전", icon: "🌅", time: "6-12시" },
                                { value: "afternoon", label: "오후", icon: "☀️", time: "12-18시" },
                                { value: "evening", label: "저녁", icon: "🌆", time: "18-22시" },
                                { value: "night", label: "밤", icon: "🌙", time: "22시 이후" },
                            ].map((time) => (
                                <button
                                    key={time.value}
                                    onClick={() => handleMultiSelect("timePreference", time.value)}
                                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                        preferences.timePreference.includes(time.value)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-2xl md:text-3xl mb-1 md:mb-2">{time.icon}</div>
                                    <div className="font-bold text-base md:text-lg text-black">{time.label}</div>
                                    <div className="text-xs md:text-sm text-gray-500">{time.time}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="text-center">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">🍽️</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            어떤 음식을 좋아하시나요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">선호하는 음식 종류를 모두 선택해주세요</p>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-4">
                            {[
                                { value: "korean", label: "한식", icon: "🍚" },
                                { value: "western", label: "양식", icon: "🍝" },
                                { value: "japanese", label: "일식", icon: "🍜" },
                                { value: "chinese", label: "중식", icon: "🥟" },
                                { value: "street", label: "길거리 음식", icon: "🌭" },
                                { value: "dessert", label: "디저트 & 카페", icon: "🧁" },
                            ].map((food) => (
                                <button
                                    key={food.value}
                                    onClick={() => handleMultiSelect("foodPreference", food.value)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                        preferences.foodPreference.includes(food.value)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-xl md:text-2xl mb-1 md:mb-2">{food.icon}</div>
                                    <div className="font-medium text-sm md:text-base text-black">{food.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 5:
                return (
                    <div className="text-center">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">🏃</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            활동 강도는 어느 정도를 원하시나요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">선호하는 활동 수준을 선택해주세요</p>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-4 max-w-4xl mx-auto">
                            {[
                                {
                                    value: "low",
                                    label: "여유롭게",
                                    desc: "카페, 전시관람, 쇼핑 위주",
                                    icon: "🛋️",
                                },
                                {
                                    value: "medium",
                                    label: "적당히 활동적",
                                    desc: "도보 이동, 간단한 체험활동",
                                    icon: "🚶",
                                },
                                {
                                    value: "high",
                                    label: "매우 활동적",
                                    desc: "하이킹, 스포츠, 모험활동",
                                    icon: "🏔️",
                                },
                            ].map((level) => (
                                <button
                                    key={level.value}
                                    onClick={() => handleSingleSelect("activityLevel", level.value)}
                                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                        preferences.activityLevel === level.value
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-3xl md:text-4xl mb-2 md:mb-3">{level.icon}</div>
                                    <div className="font-bold text-base md:text-lg mb-1 md:mb-2 text-black">
                                        {level.label}
                                    </div>
                                    <div className="text-xs md:text-sm text-gray-500">{level.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 6:
                return (
                    <div className="text-center">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">👥</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            주로 몇 명과 함께 여행하시나요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">가장 일반적인 여행 인원을 선택해주세요</p>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-4">
                            {[
                                { value: "solo", label: "혼자", icon: "🧑" },
                                { value: "couple", label: "커플/둘이", icon: "👫" },
                                { value: "small", label: "소그룹 (3-5명)", icon: "👨‍👩‍👧" },
                                { value: "large", label: "대그룹 (6명+)", icon: "👨‍👩‍👧‍👦" },
                            ].map((size) => (
                                <button
                                    key={size.value}
                                    onClick={() => handleSingleSelect("groupSize", size.value)}
                                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                        preferences.groupSize === size.value
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-2xl md:text-3xl mb-1 md:mb-2">{size.icon}</div>
                                    <div className="font-medium text-base md:text-lg text-black">{size.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 7:
                return (
                    <div className="text-center">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">🎨</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            어떤 분야에 관심이 있으신가요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">관심 분야를 모두 선택해주세요</p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                                { value: "art", label: "예술/문화", icon: "🎭" },
                                { value: "history", label: "역사/전통", icon: "🏛️" },
                                { value: "nature", label: "자연/풍경", icon: "🌲" },
                                { value: "music", label: "음악/공연", icon: "🎵" },
                                { value: "sports", label: "스포츠", icon: "⚽" },
                                { value: "technology", label: "과학/기술", icon: "🔬" },
                                { value: "fashion", label: "패션/뷰티", icon: "👗" },
                                { value: "photography", label: "사진/영상", icon: "📸" },
                            ].map((interest) => (
                                <button
                                    key={interest.value}
                                    onClick={() => handleMultiSelect("interests", interest.value)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                        preferences.interests.includes(interest.value)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-xl md:text-2xl mb-1 md:mb-2">{interest.icon}</div>
                                    <div className="font-medium text-sm md:text-base text-black">{interest.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 8:
                return (
                    <div className="text-center">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">📍</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            어느 지역을 자주 방문하시나요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">선호하는 지역을 모두 선택해주세요</p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                                "강남",
                                "홍대",
                                "명동",
                                "이태원",
                                "성수동",
                                "건대",
                                "신촌",
                                "압구정",
                                "청담",
                                "종로",
                                "인사동",
                                "남산",
                            ].map((location) => (
                                <button
                                    key={location}
                                    onClick={() => handleMultiSelect("locationPreferences", location)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                        preferences.locationPreferences.includes(location)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    📍 <span className="text-sm md:text-base text-black">{location}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const isStepValid = () => {
        switch (currentStep) {
            case 1:
                return preferences.travelStyle.length > 0;
            case 2:
                return preferences.budgetRange !== "";
            case 3:
                return preferences.timePreference.length > 0;
            case 4:
                return preferences.foodPreference.length > 0;
            case 5:
                return preferences.activityLevel !== "";
            case 6:
                return preferences.groupSize !== "";
            case 7:
                return preferences.interests.length > 0;
            case 8:
                return preferences.locationPreferences.length > 0;
            default:
                return true;
        }
    };

    return (
        <div className="h-[100dvh] min-h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-purple-50 py-4 md:py-8 flex flex-col">
            <div className="max-w-4xl mx-auto px-4 w-full flex flex-col flex-1 min-h-0">
                {/* 진행률 바 */}
                <div className="mb-4 md:mb-8 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-gray-900">AI 개인화 설정</h1>
                        <span className="text-sm text-gray-500">
                            {currentStep}/{totalSteps}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* 단계별 컨텐츠 */}
                <div className="bg-white rounded-2xl shadow-xl p-3 md:p-4 mb-4 md:mb-8 flex-1 min-h-0 overflow-y-auto md:overflow-visible no-scrollbar scrollbar-hide overscroll-contain">
                    <div className="md:hidden grid gap-2" style={{ gridTemplateColumns: "1fr" }}>
                        {/* 모바일: 스크롤 없이 한 화면에 담기도록 요소 간격과 폰트 사이즈 축소 */}
                        <div className="text-center space-y-2 text-sm leading-relaxed">{renderStep()}</div>
                    </div>
                    <div className="hidden md:block">{renderStep()}</div>
                </div>

                {/* 네비게이션 버튼 */}
                <div className="flex justify-between md:justify-between px-2 md:px-0 flex-shrink-0">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className="px-4  py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                        이전
                    </button>

                    <button
                        onClick={nextStep}
                        disabled={!isStepValid()}
                        className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {currentStep === totalSteps ? "완료" : "다음"}
                    </button>
                </div>

                {/* 건너뛰기 옵션 */}
                <div className="text-center mt-3 md:mt-6 mb-2 md:mb-6 flex-shrink-0">
                    <button
                        onClick={() => router.push("/")}
                        className="text-gray-500 hover:text-gray-700 text-sm underline cursor-pointer"
                    >
                        나중에 설정하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIOnboarding;
