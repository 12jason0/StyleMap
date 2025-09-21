"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

// --- 수정된 부분: 데이터 타입 정의 ---
// API 응답 데이터 구조에 맞게 타입을 명확하게 수정했습니다.

interface UserInfo {
    name: string;
    email: string;
    joinDate: string;
    profileImage: string;
    mbti?: string | null;
    age?: number | null;
}

interface UserPreferences {
    travelStyle: string[];
    budgetRange: string;
    timePreference: string[];
    foodPreference: string[];
    activityLevel: string;
    groupSize: string;
    interests: string[];
    locationPreferences: string[];
}

interface Booking {
    id: string;
    courseTitle: string;
    date: string;
    status: string;
    price: string;
    participants: number;
}

// 1. Course의 타입을 먼저 정의합니다.
interface CourseInfoForFavorite {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    price: string;
    rating: number;
    concept: string;
}

// 2. Favorite 타입이 CourseInfoForFavorite를 포함하도록 수정합니다.
interface Favorite {
    id: number; // 찜(favorite)의 고유 ID
    course_id: number; // 강좌의 ID
    course: CourseInfoForFavorite; // 중첩된 강좌 정보
}

interface UserBadgeItem {
    id: number;
    name: string;
    image_url?: string | null;
    description?: string | null;
    awarded_at: string;
}

declare global {
    interface Window {
        Kakao?: any;
    }
}

const MyPage = () => {
    const router = useRouter();
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [completed, setCompleted] = useState<
        Array<{
            course_id: number;
            title: string;
            description: string;
            imageUrl: string;
            rating: number;
            concept: string;
            completedAt?: string | null;
        }>
    >([]);
    const [badges, setBadges] = useState<UserBadgeItem[]>([]);
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        mbti: "",
        age: "",
    });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        fetchUserInfo();
        fetchUserPreferences();
        fetchFavorites();
        fetchBadges();
        fetchCompleted();

        try {
            const url = new URL(window.location.href);
            const tab = url.searchParams.get("tab");
            if (["profile", "preferences", "favorites", "completed", "badges"].includes(tab || "")) {
                setActiveTab(tab || "profile");
            }
        } catch {}
    }, []);

    const fetchUserInfo = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                router.push("/login");
                return;
            }

            const response = await fetch("/api/users/profile", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUserInfo(data.user);
            } else {
                console.error("Failed to fetch user info");
            }
        } catch (error) {
            console.error("Failed to fetch user info:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBadges = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            const res = await fetch("/api/users/badges", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                console.error("Failed to fetch badges, status:", res.status);
                setBadges([]);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) setBadges(data);
        } catch (error) {
            console.error("Error fetching badges:", error);
            setBadges([]);
        }
    };

    const fetchUserPreferences = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            const response = await fetch("/api/users/preferences", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setUserPreferences(data);
            }
        } catch (error) {
            console.error("Failed to fetch user preferences:", error);
        }
    };

    const fetchFavorites = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            const response = await fetch("/api/users/favorites", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setFavorites(data || []);
            } else {
                console.log("찜 목록 조회 실패, 빈 배열로 설정");
                setFavorites([]);
            }
        } catch (error) {
            console.error("Failed to fetch favorites:", error);
            setFavorites([]);
        }
    };

    const fetchCompleted = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;
            const res = await fetch("/api/users/completions", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCompleted(Array.isArray(data) ? data : []);
            } else {
                setCompleted([]);
            }
        } catch (e) {
            setCompleted([]);
        }
    };

    const removeFavorite = async (courseId: number) => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            const response = await fetch(`/api/users/favorites?courseId=${courseId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setFavorites((prev) => prev.filter((fav) => fav.course_id !== courseId));
            } else {
                console.error("Failed to remove favorite");
            }
        } catch (error) {
            console.error("Failed to remove favorite:", error);
        }
    };

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        window.dispatchEvent(new Event("authTokenChange"));
        setShowLogoutModal(false);
        router.push("/");
    };

    const handleEditClick = () => {
        if (userInfo) {
            setEditForm({
                name: userInfo.name || "",
                email: userInfo.email || "",
                mbti: userInfo.mbti || "",
                age: userInfo.age?.toString() || "",
            });
            setShowEditModal(true);
            setEditError("");
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditLoading(true);
        setEditError("");

        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            const response = await fetch("/api/users/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(editForm),
            });

            const data = await response.json();

            if (response.ok) {
                setUserInfo({
                    ...userInfo!,
                    name: editForm.name,
                    email: editForm.email,
                    mbti: editForm.mbti || null,
                    age: editForm.age ? parseInt(editForm.age) : null,
                });
                setShowEditModal(false);
                alert("프로필이 성공적으로 수정되었습니다.");
            } else {
                setEditError(data.error || "프로필 수정에 실패했습니다.");
            }
        } catch (error) {
            console.error("프로필 수정 오류:", error);
            setEditError("프로필 수정 중 오류가 발생했습니다.");
        } finally {
            setEditLoading(false);
        }
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setEditForm({
            ...editForm,
            [e.target.name]: e.target.value,
        });
    };

    const renderProfileTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">프로필 정보</h3>
                {userInfo ? (
                    <div className="flex items-center space-x-4 md:space-x-6">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xl md:text-2xl font-bold">{userInfo.name[0]}</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{userInfo.name}</h4>
                            <p className="text-gray-600 mb-1 text-sm md:text-base">{userInfo.email}</p>
                            <div className="flex items-center space-x-3 md:space-x-4 text-xs md:text-sm text-gray-500">
                                <span>가입일: {userInfo.joinDate}</span>
                                {userInfo.mbti && <span>MBTI: {userInfo.mbti}</span>}
                                {userInfo.age && <span>나이: {userInfo.age}세</span>}
                            </div>
                        </div>
                        <button
                            onClick={handleEditClick}
                            className="px-3 md:px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-semibold cursor-pointer border border-blue-200 rounded-lg"
                        >
                            수정
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-5xl md:text-6xl mb-3 md:mb-4">👤</div>
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                            프로필 정보를 불러오는 중...
                        </h4>
                    </div>
                )}
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">계정 관리</h3>
                <div className="space-y-4">
                    <button className="w-full text-left px-3 md:px-4 py-2.5 md:py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-sm md:text-base">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">비밀번호 변경</span>
                            <span className="text-gray-400">→</span>
                        </div>
                    </button>
                    <button className="w-full text-left px-3 md:px-4 py-2.5 md:py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-sm md:text-base">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">알림 설정</span>
                            <span className="text-gray-400">→</span>
                        </div>
                    </button>
                    <button
                        onClick={handleLogoutClick}
                        className="w-full text-left px-3 md:px-4 py-2.5 md:py-3 rounded-lg border border-red-200 hover:bg-red-50 transition-colors cursor-pointer text-sm md:text-base"
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-red-600">로그아웃</span>
                            <span className="text-red-400">→</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderPreferencesTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">내 선호도</h3>
                    <button
                        onClick={() => router.push("/onboarding")}
                        className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                        수정하기
                    </button>
                </div>
                {userPreferences ? (
                    <div className="space-y-6">
                        {userPreferences.travelStyle && userPreferences.travelStyle.length > 0 && (
                            <div>
                                <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-3">
                                    여행 스타일
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {userPreferences.travelStyle.map((style) => (
                                        <span
                                            key={style}
                                            className="px-2.5 md:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs md:text-sm"
                                        >
                                            {style}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {userPreferences.budgetRange && (
                            <div>
                                <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-3">
                                    예산 범위
                                </h4>
                                <span className="px-2.5 md:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs md:text-sm">
                                    {userPreferences.budgetRange === "budget" && "5만원 미만"}
                                    {userPreferences.budgetRange === "moderate" && "5만원 ~ 10만원"}
                                    {userPreferences.budgetRange === "premium" && "10만원 ~ 20만원"}
                                    {userPreferences.budgetRange === "luxury" && "20만원 이상"}
                                </span>
                            </div>
                        )}
                        {userPreferences.locationPreferences && userPreferences.locationPreferences.length > 0 && (
                            <div>
                                <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-3">
                                    선호 지역
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {userPreferences.locationPreferences.map((location) => (
                                        <span
                                            key={location}
                                            className="px-2.5 md:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs md:text-sm"
                                        >
                                            📍 {location}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎯</div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">선호도가 설정되지 않았어요</h4>
                        <p className="text-gray-600 mb-4">선호도를 설정하면 더 정확한 추천을 받을 수 있어요</p>
                        <button
                            onClick={() => router.push("/onboarding")}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                            선호도 설정하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    // --- 수정된 부분: renderFavoritesTab ---
    // API 응답 구조에 맞춰 favorite.course.title 처럼 중첩된 객체에 접근하도록 수정했습니다.
    const renderFavoritesTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">내 여행 보관함</h3>

                {favorites.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map((favorite) => (
                            <div
                                key={favorite.id}
                                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => router.push(`/courses/${favorite.course_id}`)}
                            >
                                <div className="relative">
                                    {favorite.course.imageUrl ? (
                                        <img
                                            src={favorite.course.imageUrl}
                                            alt={favorite.course.title}
                                            className="w-full h-48 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-white" />
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFavorite(favorite.course_id);
                                        }}
                                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                    >
                                        ×
                                    </button>
                                    <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                        {favorite.course.concept}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                                        {favorite.course.title}
                                    </h4>
                                    <p className="text-gray-600 text-xs md:text-sm mb-3 line-clamp-2">
                                        {favorite.course.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <span className="text-yellow-400">★</span>
                                            <span className="text-xs md:text-sm font-medium">
                                                {favorite.course.rating}
                                            </span>
                                        </div>
                                        <span className="text-blue-600 font-semibold text-sm md:text-base">
                                            {favorite.course.price}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">💖</div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">찜한 코스가 없어요</h4>
                        <p className="text-gray-600 mb-4">마음에 드는 코스를 찜해보세요!</p>
                        <button
                            onClick={() => router.push("/courses")}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                            코스 둘러보기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const [selectedBadge, setSelectedBadge] = useState<UserBadgeItem | null>(null);

    const ensureKakaoSdk = async (): Promise<any | null> => {
        if (typeof window === "undefined") return null;
        if (!window.Kakao) {
            await new Promise<void>((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://developers.kakao.com/sdk/js/kakao.js";
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error("Kakao SDK load failed"));
                document.head.appendChild(script);
            });
        }
        const Kakao = window.Kakao;
        try {
            if (Kakao && !Kakao.isInitialized?.()) {
                const key =
                    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY || (process as any).env?.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
                if (!key) return Kakao;
                Kakao.init(key);
            }
        } catch {}
        return Kakao || null;
    };

    const shareBadgeToKakao = async (badge: UserBadgeItem) => {
        try {
            const Kakao = await ensureKakaoSdk();
            const link = typeof location !== "undefined" ? location.href : "";
            const imageUrl = badge.image_url || "/images/maker.png";
            const bragText = `${userInfo?.name || "저"}는 '${
                badge.name
            }' 배지를 획득했어요! StyleMap에서 함께 도전해요 ✨`;
            if (Kakao && Kakao.Share) {
                Kakao.Share.sendDefault({
                    objectType: "feed",
                    content: {
                        title: "배지 자랑하기",
                        description: bragText,
                        imageUrl,
                        link: { webUrl: link, mobileWebUrl: link },
                    },
                    buttons: [{ title: "자세히 보기", link: { webUrl: link, mobileWebUrl: link } }],
                });
                return;
            }
            const shareText = `${bragText} ${link}`;
            if (navigator.share) {
                try {
                    if (imageUrl) {
                        const res = await fetch(imageUrl, { mode: "cors" }).catch(() => null as any);
                        if (res && res.ok) {
                            const blob = await res.blob();
                            const file = new File([blob], "badge.jpg", { type: blob.type || "image/jpeg" });
                            const can = (navigator as any).canShare?.({ files: [file] });
                            if (can) {
                                await (navigator as any).share({
                                    title: "배지 자랑하기",
                                    text: shareText,
                                    files: [file],
                                });
                                return;
                            }
                        }
                    }
                    await navigator.share({ title: "배지 자랑하기", text: shareText, url: link });
                    return;
                } catch {}
            } else {
                await navigator.clipboard.writeText(shareText);
                alert("링크가 클립보드에 복사되었습니다.");
            }
        } catch {
            const shareText = `${userInfo?.name || "저"}는 '${badge.name}' 배지를 획득했어요! ${
                typeof location !== "undefined" ? location.href : ""
            }`;
            await navigator.clipboard.writeText(shareText);
            alert("링크가 클립보드에 복사되었습니다.");
        }
    };

    const renderBadgesTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">내 뱃지</h3>
                </div>
                {badges.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                        {badges.map((b) => (
                            <div
                                key={b.id}
                                className="border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center bg-white hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => setSelectedBadge(b)}
                            >
                                {b.image_url ? (
                                    <img src={b.image_url} alt={b.name} className="w-20 h-20 object-contain mb-3" />
                                ) : (
                                    <div className="w-20 h-20 mb-3 rounded-full bg-yellow-100 flex items-center justify-center text-3xl">
                                        🏅
                                    </div>
                                )}
                                <div className="text-sm font-semibold text-gray-900 mb-1">{b.name}</div>
                                {b.description && (
                                    <div className="text-xs text-gray-600 line-clamp-2 mb-1">{b.description}</div>
                                )}
                                <div className="text-[11px] text-gray-400">
                                    {new Date(b.awarded_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <div className="text-6xl mb-3">🏅</div>
                        <div className="text-lg font-semibold text-gray-900 mb-1">아직 획득한 뱃지가 없어요</div>
                        <div className="text-gray-600">스토리를 완료하고 배지를 모아보세요!</div>
                    </div>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <Header />
                <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
                    <div className="text-center">
                        <div className="text-6xl mb-4">⏳</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">로딩 중...</h1>
                        <p className="text-gray-600">마이페이지 정보를 불러오고 있습니다</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 typography-smooth">
            <Header />

            <main className="max-w-4xl mx-auto px-4 py-6 md:py-8 pt-20 md:pt-24">
                <div className="text-center mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2 tracking-tight">
                        마이페이지
                    </h1>
                    <p className="text-sm md:text-[17px] text-gray-600">내 정보와 활동을 관리해보세요</p>
                </div>

                <div className="flex justify-center mb-6 md:mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-1">
                        <div className="flex space-x-1">
                            {[
                                { id: "profile", label: "프로필", icon: "👤" },
                                { id: "preferences", label: "선호도", icon: "🎯" },
                                { id: "favorites", label: "내 여행 보관함", icon: "💖" },
                                { id: "completed", label: "완료한 코스", icon: "✅" },
                                { id: "badges", label: "뱃지", icon: "🏅" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium transition-all cursor-pointer text-sm md:text-base ${
                                        activeTab === tab.id
                                            ? "bg-blue-600 text-white shadow-lg"
                                            : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <span className="mr-2">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {activeTab === "profile" && renderProfileTab()}
                {activeTab === "preferences" && renderPreferencesTab()}
                {activeTab === "favorites" && renderFavoritesTab()}
                {activeTab === "badges" && renderBadgesTab()}
                {activeTab === "completed" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                            <div className="flex items-center justify-between mb-4 md:mb-6">
                                <h3 className="text-xl md:text-2xl font-bold text-gray-900">완료한 코스</h3>
                            </div>
                            {completed.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {completed.map((c) => (
                                        <div
                                            key={c.course_id}
                                            className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                            onClick={() => router.push(`/courses/${c.course_id}`)}
                                        >
                                            <div className="relative">
                                                {c.imageUrl ? (
                                                    <img
                                                        src={c.imageUrl}
                                                        alt={c.title}
                                                        className="w-full h-48 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-48 bg-white" />
                                                )}
                                                {c.concept && (
                                                    <div className="absolute bottom-2 left-2 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                                        {c.concept}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                                                    {c.title}
                                                </h4>
                                                <div className="flex items-center justify-between text-xs text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-yellow-400">★</span>
                                                        <span className="font-medium">{c.rating}</span>
                                                    </div>
                                                    {c.completedAt && (
                                                        <span>{new Date(c.completedAt).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <div className="text-6xl mb-3">✅</div>
                                    <div className="text-lg font-semibold text-gray-900 mb-1">
                                        아직 완료한 코스가 없어요
                                    </div>
                                    <div className="text-gray-600 mb-4">코스를 완료하면 여기에서 확인할 수 있어요</div>
                                    <button
                                        onClick={() => router.push("/courses")}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                                    >
                                        코스 둘러보기
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">프로필 수정</h3>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-6">
                            {editError && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-600 text-sm">{editError}</p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                    닉네임
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={editForm.name || ""}
                                    onChange={handleEditChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
                                    placeholder="닉네임을 입력하세요"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    이메일
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={editForm.email || ""}
                                    onChange={handleEditChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
                                    placeholder="이메일을 입력하세요"
                                />
                            </div>

                            <div>
                                <label htmlFor="mbti" className="block text-sm font-medium text-gray-700 mb-2">
                                    MBTI
                                </label>
                                <select
                                    id="mbti"
                                    name="mbti"
                                    value={editForm.mbti || ""}
                                    onChange={handleEditChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
                                >
                                    <option value="">MBTI를 선택하세요</option>
                                    <option value="INTJ">INTJ</option>
                                    <option value="INTP">INTP</option>
                                    <option value="ENTJ">ENTJ</option>
                                    <option value="ENTP">ENTP</option>
                                    <option value="INFJ">INFJ</option>
                                    <option value="INFP">INFP</option>
                                    <option value="ENFJ">ENFJ</option>
                                    <option value="ENFP">ENFP</option>
                                    <option value="ISTJ">ISTJ</option>
                                    <option value="ISFJ">ISFJ</option>
                                    <option value="ESTJ">ESTJ</option>
                                    <option value="ESFJ">ESFJ</option>
                                    <option value="ISTP">ISTP</option>
                                    <option value="ISFP">ISFP</option>
                                    <option value="ESTP">ESTP</option>
                                    <option value="ESFP">ESFP</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                                    나이
                                </label>
                                <input
                                    type="number"
                                    id="age"
                                    name="age"
                                    value={editForm.age || ""}
                                    onChange={handleEditChange}
                                    min="1"
                                    max="120"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
                                    placeholder="나이를 입력하세요"
                                />
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {editLoading ? "수정 중..." : "수정하기"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedBadge && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-[90vw] max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900">{selectedBadge.name}</h3>
                            <button
                                className="hover:cursor-pointer text-gray-400 hover:text-gray-600 text-2xl"
                                onClick={() => setSelectedBadge(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            {selectedBadge.image_url ? (
                                <img
                                    src={selectedBadge.image_url}
                                    alt={selectedBadge.name}
                                    className="w-40 h-40 object-contain mb-3"
                                />
                            ) : (
                                <div className="w-40 h-40 mb-3 rounded-full bg-yellow-100 flex items-center justify-center text-6xl">
                                    🏅
                                </div>
                            )}
                            {selectedBadge.description && (
                                <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                                    {selectedBadge.description}
                                </div>
                            )}
                            <div className="text-xs text-gray-400 mb-4">
                                획득일: {new Date(selectedBadge.awarded_at).toLocaleDateString()}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="hover:cursor-pointer px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
                                    onClick={() => selectedBadge && shareBadgeToKakao(selectedBadge)}
                                >
                                    자랑하기
                                </button>
                                <button
                                    className="hover:cursor-pointer px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                    onClick={() => {
                                        setSelectedBadge(null);
                                    }}
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showLogoutModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🚪</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">로그아웃</h3>
                            <p className="text-gray-600 mb-8">정말 로그아웃 하시겠습니까?</p>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors cursor-pointer"
                                >
                                    로그아웃
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPage;
