"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UserPreferences {
    concept: string[]; // 감성·힐링, 활동적·체험, 카페/브런치, 인생샷·사진, 맛집 탐방, 쇼핑, 야경·밤 산책, 이색 데이트
    companion: string; // 연인, 썸, 소개팅, 친구, 혼자
    mood: string[]; // 조용한, 트렌디한, 프리미엄, 활기찬, 깔끔한, 감성적, 빈티지
    regions: string[]; // 성수, 한남, 홍대, 강남, 서초, 여의도, 종로/북촌, 잠실, 신촌, 가로수길 등
}

const AIOnboarding = () => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [preferences, setPreferences] = useState<UserPreferences>({
        concept: [],
        companion: "",
        mood: [],
        regions: [],
    });

    const totalSteps = 4; // 3~4단계로 축소
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);

    // 선호도 자동 저장 함수 (debounce 적용)
    const savePreferences = useCallback(async (prefsToSave: UserPreferences, silent = true) => {
        if (isSavingRef.current) return;

        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            isSavingRef.current = true;
            const response = await fetch("/api/users/preferences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    preferences: prefsToSave,
                }),
            });

            if (response.ok) {
                if (!silent) {
                    console.log("선호도가 저장되었습니다.");
                }
            } else {
                console.error("Failed to save preferences");
            }
        } catch (error) {
            console.error("Failed to save preferences:", error);
        } finally {
            isSavingRef.current = false;
        }
    }, []);

    // preferences 변경 시 자동 저장 (debounce)
    useEffect(() => {
        // 빈 상태가 아닐 때만 저장
        const hasAnyData =
            preferences.concept.length > 0 ||
            preferences.companion !== "" ||
            preferences.mood.length > 0 ||
            preferences.regions.length > 0;

        if (!hasAnyData) return;

        // 이전 타이머 취소
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // 1초 후 자동 저장
        saveTimeoutRef.current = setTimeout(() => {
            savePreferences(preferences, true);
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [preferences, savePreferences]);

    // 페이지를 떠날 때 저장
    useEffect(() => {
        const handleBeforeUnload = () => {
            const hasAnyData =
                preferences.concept.length > 0 ||
                preferences.companion !== "" ||
                preferences.mood.length > 0 ||
                preferences.regions.length > 0;

            if (hasAnyData && !isSavingRef.current) {
                // 페이지를 떠날 때 저장 (keepalive 옵션 사용)
                const token = localStorage.getItem("authToken");
                if (token) {
                    // keepalive 옵션으로 페이지 종료 후에도 요청이 완료되도록 보장
                    fetch("/api/users/preferences", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            preferences,
                        }),
                        keepalive: true,
                    }).catch(() => {});
                }
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [preferences]);

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

    const handleSingleSelect = (key: keyof UserPreferences, value: string | boolean) => {
        setPreferences((prev) => ({ ...prev, [key]: value }));
    };

    const handleMultiSelect = (key: "concept" | "mood" | "regions", value: string) => {
        setPreferences((prev) => {
            const currentArray = (prev[key] as string[]) || [];
            const isSelected = currentArray.includes(value);
            return {
                ...prev,
                [key]: isSelected ? currentArray.filter((item) => item !== value) : [...currentArray, value],
            };
        });
    };

    const nextStep = () => {
        if (currentStep < totalSteps) {
            // 단계 변경 전에 현재까지의 데이터 저장
            savePreferences(preferences, true);
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            // 단계 변경 전에 현재까지의 데이터 저장
            savePreferences(preferences, true);
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        // 완료 시 최종 저장 (명시적으로 저장 후 리다이렉트)
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
                // 저장 성공 후 메인 페이지로 이동 (새로고침하여 선호도 상태 업데이트)
                window.location.href = "/";
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Failed to save preferences:", errorData);
                alert("선호도 저장에 실패했습니다. 다시 시도해주세요.");
            }
        } catch (error) {
            console.error("Failed to save preferences:", error);
            alert("선호도 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                // Step 1: 기본 취향 콘셉트 (다중 선택)
                return (
                    <div className="text-center text-black w-full">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">🎯</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            어떤 취향을 가지고 계신가요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">원하는 콘셉트를 모두 선택해주세요 (복수 선택 가능)</p>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-4 max-w-3xl mx-auto">
                            {[
                                { value: "감성·힐링", label: "감성·힐링", icon: "🌿" },
                                { value: "활동적·체험", label: "활동적·체험", icon: "⚡" },
                                { value: "카페/브런치", label: "카페/브런치", icon: "☕" },
                                { value: "인생샷·사진", label: "인생샷·사진", icon: "📸" },
                                { value: "맛집 탐방", label: "맛집 탐방", icon: "🍽️" },
                                { value: "쇼핑", label: "쇼핑", icon: "🛍️" },
                                { value: "야경·밤 산책", label: "야경·밤 산책", icon: "🌙" },
                                { value: "이색 데이트", label: "이색 데이트", icon: "✨" },
                            ].map((concept) => (
                                <button
                                    key={concept.value}
                                    onClick={() => handleMultiSelect("concept", concept.value)}
                                    className={`p-4 md:p-6 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                        preferences.concept.includes(concept.value)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-2xl md:text-3xl mb-1 md:mb-2">{concept.icon}</div>
                                    <div className="font-medium text-sm md:text-base text-black">{concept.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 2:
                // Step 2: 동반자 타입 (단일 선택)
                return (
                    <div className="text-center text-black w-full">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">👥</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            누구와 함께 여행하시나요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">가장 일반적인 여행 동반자를 선택해주세요</p>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-4 max-w-2xl mx-auto">
                            {[
                                { value: "연인", label: "연인", icon: "💑" },
                                { value: "썸", label: "썸", icon: "💕" },
                                { value: "소개팅", label: "소개팅", icon: "👋" },
                                { value: "친구", label: "친구", icon: "👯" },
                                { value: "혼자", label: "혼자", icon: "🧑" },
                            ].map((companion) => (
                                <button
                                    key={companion.value}
                                    onClick={() => handleSingleSelect("companion", companion.value)}
                                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                        preferences.companion === companion.value
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-2xl md:text-3xl mb-1 md:mb-2">{companion.icon}</div>
                                    <div className="font-medium text-base md:text-lg text-black">{companion.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 3:
                // Step 3: 분위기 스타일 (다중 선택)
                return (
                    <div className="text-center text-black w-full">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">✨</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            어떤 분위기를 선호하시나요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">원하는 분위기를 모두 선택해주세요 (복수 선택 가능)</p>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-4 max-w-3xl mx-auto">
                            {[
                                { value: "조용한", label: "조용한", icon: "🤫" },
                                { value: "트렌디한", label: "트렌디한", icon: "🔥" },
                                { value: "프리미엄", label: "프리미엄", icon: "👑" },
                                { value: "활기찬", label: "활기찬", icon: "⚡" },
                                { value: "깔끔한", label: "깔끔한", icon: "✨" },
                                { value: "감성적", label: "감성적", icon: "💕" },
                                { value: "빈티지", label: "빈티지", icon: "📻" },
                            ].map((mood) => (
                                <button
                                    key={mood.value}
                                    onClick={() => handleMultiSelect("mood", mood.value)}
                                    className={`p-4 md:p-6 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                        preferences.mood.includes(mood.value)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-2xl md:text-3xl mb-1 md:mb-2">{mood.icon}</div>
                                    <div className="font-medium text-sm md:text-base text-black">{mood.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 4:
                // Step 4: 자주 가는 지역 (다중 선택)
                return (
                    <div className="text-center text-black w-full">
                        <div className="text-4xl md:text-6xl mb-4 md:mb-6">📍</div>
                        <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-black">
                            자주 가는 지역은 어디인가요?
                        </h2>
                        <p className="text-black mb-6 md:mb-8">선호하는 지역을 모두 선택해주세요 (복수 선택 가능)</p>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-4 max-w-3xl mx-auto">
                            {[
                                { value: "성수", label: "성수", icon: "🏭" },
                                { value: "한남", label: "한남", icon: "🏛️" },
                                { value: "홍대", label: "홍대", icon: "🎨" },
                                { value: "강남", label: "강남", icon: "💼" },
                                { value: "서초", label: "서초", icon: "🏢" },
                                { value: "여의도", label: "여의도", icon: "🌆" },
                                { value: "종로/북촌", label: "종로/북촌", icon: "🏮" },
                                { value: "잠실", label: "잠실", icon: "🎢" },
                                { value: "신촌", label: "신촌", icon: "🎓" },
                                { value: "가로수길", label: "가로수길", icon: "🌳" },
                                { value: "이태원", label: "이태원", icon: "🌏" },
                                { value: "압구정", label: "압구정", icon: "🛍️" },
                            ].map((region) => (
                                <button
                                    key={region.value}
                                    onClick={() => handleMultiSelect("regions", region.value)}
                                    className={`p-4 md:p-6 rounded-xl border-2 transition-all cursor-pointer text-black ${
                                        preferences.regions.includes(region.value)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-2xl md:text-3xl mb-1 md:mb-2">{region.icon}</div>
                                    <div className="font-medium text-sm md:text-base text-black">{region.label}</div>
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
                return preferences.concept.length > 0;
            case 2:
                return preferences.companion !== "";
            case 3:
                return preferences.mood.length > 0;
            case 4:
                return preferences.regions.length > 0;
            default:
                return true;
        }
    };

    return (
        <div className="h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-purple-50 py-4 md:py-8 flex flex-col overflow-hidden">
            <div className="max-w-4xl mx-auto px-4 w-full flex flex-col flex-1 min-h-0">
                {/* 진행률 바 */}
                <div className="mb-3 md:mb-8 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2 md:mb-4">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">AI 개인화 설정</h1>
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

                {/* 단계별 컨텐츠 - 고정 크기, 내부 스크롤 */}
                <div
                    className="bg-white rounded-2xl shadow-xl mb-4 md:mb-8 flex-shrink-0 flex flex-col"
                    style={{ height: "calc(100dvh - 300px)", maxHeight: "600px" }}
                >
                    <div
                        className="p-4 md:p-6 overflow-y-auto flex-1 min-h-0"
                        style={{ WebkitOverflowScrolling: "touch" }}
                    >
                        {renderStep()}
                    </div>
                </div>

                {/* 네비게이션 버튼 */}
                <div className="flex justify-between md:justify-between px-2 md:px-0 flex-shrink-0">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className="px-4 py-2.5 md:py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-100 cursor-pointer text-sm md:text-base"
                    >
                        이전
                    </button>

                    <button
                        onClick={nextStep}
                        disabled={!isStepValid()}
                        className="px-4 py-2.5 md:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm md:text-base"
                    >
                        {currentStep === totalSteps ? "완료" : "다음"}
                    </button>
                </div>

                {/* 건너뛰기 옵션 */}
                <div className="text-center mb-2 md:mb-6 flex-shrink-0">
                    <button
                        onClick={() => router.push("/")}
                        className="text-gray-500 hover:text-gray-700 text-xs md:text-sm underline cursor-pointer"
                    >
                        나중에 설정하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIOnboarding;
