"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

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

interface Favorite {
    id: number;
    course_id: number;
    title: string;
    description: string;
    imageUrl: string;
    price: string;
    rating: number;
    concept: string;
    created_at: string;
}

const MyPage = () => {
    const router = useRouter();
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [favorites, setFavorites] = useState<Favorite[]>([]);
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
        fetchBookings();
        fetchFavorites();
        // URL 쿼리에서 tab 파라미터를 읽어 기본 탭 설정
        try {
            const url = new URL(window.location.href);
            const tab = url.searchParams.get("tab");
            if (tab === "favorites" || tab === "profile" || tab === "preferences" || tab === "bookings") {
                setActiveTab(tab);
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

    const fetchUserPreferences = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                router.push("/login");
                return;
            }

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

    const fetchBookings = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                router.push("/login");
                return;
            }

            const response = await fetch("/api/users/bookings", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log("예약 내역 응답:", data);
                setBookings(data.bookings || []);
            } else {
                // 예약 내역 조회 실패 시 빈 배열로 설정
                console.log("예약 내역 조회 실패, 빈 배열로 설정");
                setBookings([]);
            }
        } catch (error) {
            console.error("Failed to fetch bookings:", error);
            // 오류 발생 시에도 빈 배열로 설정
            setBookings([]);
        }
    };

    const fetchFavorites = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                router.push("/login");
                return;
            }

            const response = await fetch("/api/users/favorites", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setFavorites(data || []);
            } else {
                // 찜 목록 조회 실패 시 빈 배열로 설정
                console.log("찜 목록 조회 실패, 빈 배열로 설정");
                setFavorites([]);
            }
        } catch (error) {
            console.error("Failed to fetch favorites:", error);
            // 오류 발생 시에도 빈 배열로 설정
            setFavorites([]);
        }
    };

    const removeFavorite = async (courseId: number) => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                router.push("/login");
                return;
            }

            const response = await fetch(`/api/users/favorites?courseId=${courseId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                // 찜 목록에서 제거
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
        // 커스텀 이벤트 발생시켜 헤더 상태 업데이트
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
            if (!token) {
                router.push("/login");
                return;
            }

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
                // 사용자 정보 업데이트
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
            {/* 프로필 정보 */}
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

            {/* 계정 관리 */}
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
            {/* 선호도 정보 */}
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
                        {/* 여행 스타일 */}
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

                        {/* 예산 */}
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

                        {/* 선호 지역 */}
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

    const renderBookingsTab = () => (
        <div className="space-y-6">
            {/* 예약 내역 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">예약 내역</h3>

                {bookings.length > 0 ? (
                    <div className="space-y-4">
                        {bookings.map((booking) => (
                            <div
                                key={booking.id}
                                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2 md:mb-3">
                                    <h4 className="text-base md:text-lg font-semibold text-gray-900">
                                        {booking.courseTitle}
                                    </h4>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            booking.status === "예약완료"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                        }`}
                                    >
                                        {booking.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs md:text-sm text-gray-600">
                                    <span>📅 {booking.date}</span>
                                    <span>👥 {booking.participants}명</span>
                                    <span className="font-semibold text-blue-600">{booking.price}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">📋</div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">예약 내역이 없어요</h4>
                        <p className="text-gray-600 mb-4">첫 번째 여행을 예약해보세요!</p>
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

    const renderFavoritesTab = () => (
        <div className="space-y-6">
            {/* 찜 목록 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">찜 목록</h3>

                {favorites.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map((favorite) => (
                            <div
                                key={favorite.id}
                                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => router.push(`/courses/${favorite.course_id}`)}
                            >
                                <div className="relative">
                                    {favorite.imageUrl ? (
                                        <img
                                            src={favorite.imageUrl}
                                            alt={favorite.title}
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
                                        {favorite.concept}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                                        {favorite.title}
                                    </h4>
                                    <p className="text-gray-600 text-xs md:text-sm mb-3 line-clamp-2">
                                        {favorite.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <span className="text-yellow-400">★</span>
                                            <span className="text-xs md:text-sm font-medium">{favorite.rating}</span>
                                        </div>
                                        <span className="text-blue-600 font-semibold text-sm md:text-base">
                                            {favorite.price}
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
                {/* 헤더 섹션 */}
                <div className="text-center mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2 tracking-tight">
                        마이페이지
                    </h1>
                    <p className="text-sm md:text-[17px] text-gray-600">내 정보와 활동을 관리해보세요</p>
                </div>

                {/* 탭 네비게이션 */}
                <div className="flex justify-center mb-6 md:mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-1">
                        <div className="flex space-x-1">
                            {[
                                { id: "profile", label: "프로필", icon: "👤" },
                                { id: "preferences", label: "선호도", icon: "🎯" },
                                { id: "bookings", label: "예약내역", icon: "📋" },
                                { id: "favorites", label: "찜 목록", icon: "💖" },
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

                {/* 탭 컨텐츠 */}
                {activeTab === "profile" && renderProfileTab()}
                {activeTab === "preferences" && renderPreferencesTab()}
                {activeTab === "bookings" && renderBookingsTab()}
                {activeTab === "favorites" && renderFavoritesTab()}
            </main>

            {/* 프로필 수정 모달 */}
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

            {/* 로그아웃 확인 모달 */}
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
