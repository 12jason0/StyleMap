"use client";

import { useState, useEffect } from "react";

interface PopupData {
    id: number;
    title: string;
    category: string;
    description: string;
    period: string;
    location: string;
    city: string;
    latitude: number;
    longitude: number;
    status: "ongoing" | "coming" | "ending";
}

const categoryNames: Record<string, string> = {
    food: "푸드",
    fashion: "패션",
    art: "아트",
    lifestyle: "라이프스타일",
    tech: "테크",
};

const statusText: Record<string, string> = {
    ongoing: "진행중",
    coming: "오픈예정",
    ending: "마감임박",
};

export default function PopupPage() {
    const [activeFilter, setActiveFilter] = useState("all");
    const [popupData, setPopupData] = useState<PopupData[]>([]);
    const [filteredPopups, setFilteredPopups] = useState<PopupData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 팝업 데이터 가져오기
    useEffect(() => {
        const fetchPopups = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch("/api/popups");
                const data = await response.json();

                if (response.ok) {
                    setPopupData(data);
                    setFilteredPopups(data);
                } else {
                    setError(data.error || "팝업 데이터를 가져오는데 실패했습니다.");
                }
            } catch (error) {
                console.error("팝업 데이터 가져오기 오류:", error);
                setError("팝업 데이터를 가져오는데 실패했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPopups();
    }, []);

    const handleFilterChange = (filter: string) => {
        setIsLoading(true);
        setActiveFilter(filter);

        setTimeout(() => {
            const filtered = filter === "all" ? popupData : popupData.filter((popup) => popup.category === filter);
            setFilteredPopups(filtered);
            setIsLoading(false);
        }, 500);
    };

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget;
        card.style.transform = "scale(0.98)";
        setTimeout(() => {
            card.style.transform = "";
        }, 150);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-gray-800 pt-10">
            <div className="max-w-7xl mx-auto px-5 py-8">
                {/* Header */}
                <div className="text-center mb-12 pt-10">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
                        🎪 현재 진행 중인 팝업
                    </h1>
                    <p className="text-xl text-white/90 font-light">지금 가장 핫한 팝업 스토어들을 만나보세요</p>
                </div>

                {/* Filter Buttons */}
                <div className="flex justify-center flex-wrap gap-3 mb-10">
                    {["all", "food", "fashion", "art", "lifestyle", "tech"].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => handleFilterChange(filter)}
                            className={`px-6 py-3 rounded-full font-medium transition-all duration-300 backdrop-blur-md active:scale-95 ${
                                activeFilter === filter
                                    ? "bg-white/30 text-white transform -translate-y-1"
                                    : "bg-white/20 text-white hover:bg-white/30 hover:-translate-y-1"
                            }`}
                        >
                            {filter === "all" ? "전체" : categoryNames[filter]}
                        </button>
                    ))}
                </div>

                {/* Loading Animation */}
                {isLoading && (
                    <div className="flex justify-center items-center py-10">
                        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="text-center py-10">
                        <div className="text-6xl mb-4">😔</div>
                        <h3 className="text-xl font-semibold text-white mb-2">데이터를 불러올 수 없습니다</h3>
                        <p className="text-white/80">{error}</p>
                    </div>
                )}

                {/* Popup Grid */}
                <div
                    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-500 ${
                        isLoading ? "opacity-50" : "opacity-100"
                    }`}
                >
                    {filteredPopups.map((popup, index) => (
                        <div
                            key={popup.id}
                            onClick={handleCardClick}
                            className={`popup-card bg-white/95 rounded-3xl overflow-hidden shadow-2xl transition-all duration-400 hover:-translate-y-3 hover:shadow-3xl cursor-pointer backdrop-blur-md active:scale-95 ${
                                popup.category === "food"
                                    ? "food-gradient"
                                    : popup.category === "fashion"
                                    ? "fashion-gradient"
                                    : popup.category === "art"
                                    ? "art-gradient"
                                    : popup.category === "lifestyle"
                                    ? "lifestyle-gradient"
                                    : popup.category === "tech"
                                    ? "tech-gradient"
                                    : ""
                            }`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Popup Image */}
                            <div className="h-48 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-pink-400 to-orange-400"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center">
                                        <span className="text-3xl">🎪</span>
                                    </div>
                                </div>
                            </div>

                            {/* Popup Content */}
                            <div className="p-6">
                                <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium mb-4">
                                    {categoryNames[popup.category]}
                                </span>

                                <h3 className="text-xl font-bold text-gray-800 mb-3">{popup.title}</h3>

                                <p className="text-gray-600 leading-relaxed mb-6">{popup.description}</p>

                                <div className="flex justify-between items-start flex-wrap gap-3">
                                    <div>
                                        <div className="text-gray-500 text-sm font-medium mb-1">📅 {popup.period}</div>
                                        <div className="text-blue-500 font-semibold">📍 {popup.location}</div>
                                    </div>

                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                            popup.status === "ongoing"
                                                ? "bg-green-500 text-white"
                                                : popup.status === "coming"
                                                ? "bg-yellow-500 text-white"
                                                : "bg-red-500 text-white"
                                        }`}
                                    >
                                        {statusText[popup.status]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* 모바일 하단 네비게이션을 위한 여백 */}
            <div className="md:hidden h-20"></div>

            <style jsx>{`
                .popup-card {
                    animation: fadeInUp 0.6s ease-out forwards;
                }

                .food-gradient .h-48 > div:first-child {
                    background: linear-gradient(45deg, #ff6b6b, #feca57);
                }

                .fashion-gradient .h-48 > div:first-child {
                    background: linear-gradient(45deg, #ff9ff3, #f368e0);
                }

                .art-gradient .h-48 > div:first-child {
                    background: linear-gradient(45deg, #74b9ff, #0984e3);
                }

                .lifestyle-gradient .h-48 > div:first-child {
                    background: linear-gradient(45deg, #00b894, #00cec9);
                }

                .tech-gradient .h-48 > div:first-child {
                    background: linear-gradient(45deg, #6c5ce7, #a29bfe);
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .shadow-3xl {
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                .duration-400 {
                    transition-duration: 400ms;
                }
            `}</style>
        </div>
    );
}
