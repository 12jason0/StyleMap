"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Course {
    id: string;
    title: string;
    description: string;
    duration: string;
    location: string;
    price: string;
    participants: number;
    imageUrl: string;
    concept: string;
    rating: number;
    reviewCount: number;
    viewCount: number;
    creator?: {
        id: string;
        name: string;
    };
}

interface Review {
    id: string;
    userId: string;
    courseId: string;
    rating: number;
    comment: string;
    createdAt: string;
    user: {
        nickname: string;
        initial: string;
    };
    course: {
        title: string;
        concept: string;
    };
}

const AboutPage = () => {
    const [courseCount, setCourseCount] = useState<number>(0);
    const [courses, setCourses] = useState<Course[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentReviewPage, setCurrentReviewPage] = useState(0);

    // 페이지 로드 시 스크롤을 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // 코스 개수는 항상 DB에서 직접 최신값을 가져오도록 별도로 요청
    useEffect(() => {
        const fetchCourseCount = async () => {
            try {
                const res = await fetch("/api/courses/count", { cache: "no-store" });
                if (res.ok) {
                    const data: { count: number } = await res.json();
                    setCourseCount(data.count || 0);
                }
            } catch (e) {
                console.error("Failed to fetch live course count", e);
            }
        };
        fetchCourseCount();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 캐시된 데이터 확인
                const cachedData = sessionStorage.getItem("aboutPageData");
                const cacheTime = sessionStorage.getItem("aboutPageDataTime");
                const now = Date.now();

                // 5분 이내 캐시된 데이터가 있으면 사용
                if (cachedData && cacheTime && now - parseInt(cacheTime) < 5 * 60 * 1000) {
                    const data = JSON.parse(cachedData);
                    setCourseCount(data.courseCount);
                    setCourses(data.courses);
                    setReviews(data.reviews);
                    setLoading(false);
                    return;
                }

                // 코스 개수, 코스 데이터, 후기 데이터를 병렬로 가져오기
                const [countResponse, coursesResponse, reviewsResponse] = await Promise.all([
                    fetch("/api/courses/count", {
                        cache: "force-cache",
                        next: { revalidate: 300 }, // 5분 캐시
                    }),
                    fetch("/api/courses?limit=3", {
                        cache: "force-cache",
                        next: { revalidate: 300 },
                    }),
                    fetch("/api/reviews?limit=9", {
                        cache: "force-cache",
                        next: { revalidate: 300 },
                    }),
                ]);

                let countData: { count: number } = { count: 0 };
                let coursesData: any[] = [];
                let reviewsData: any[] = [];

                if (countResponse.ok) {
                    countData = await countResponse.json();
                    setCourseCount(countData.count);
                } else {
                    console.error("Failed to fetch course count");
                    setCourseCount(0);
                }

                if (coursesResponse.ok) {
                    coursesData = await coursesResponse.json();
                    setCourses(coursesData);
                } else {
                    console.error("Failed to fetch courses");
                    setCourses([]);
                }

                if (reviewsResponse.ok) {
                    reviewsData = await reviewsResponse.json();
                    // 9개의 후기를 가져와서 3개씩 3페이지로 나누기
                    setReviews(reviewsData.slice(0, 9));
                } else {
                    console.error("Failed to fetch reviews:", reviewsResponse.status);
                    setReviews([]);
                }

                // 데이터를 캐시에 저장
                const dataToCache = {
                    courseCount: countData.count || 0,
                    courses: coursesData,
                    reviews: reviewsData.slice(0, 9),
                };
                sessionStorage.setItem("aboutPageData", JSON.stringify(dataToCache));
                sessionStorage.setItem("aboutPageDataTime", now.toString());
            } catch (error) {
                console.error("Error fetching data:", error);
                setCourseCount(0);
                setCourses([]);
                setReviews([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // 자동 슬라이드 효과
    useEffect(() => {
        if (reviews.length > 0) {
            console.log("Starting auto slide with", reviews.length, "reviews");
            const interval = setInterval(() => {
                setCurrentReviewPage((prev) => {
                    const next = (prev + 1) % 3;
                    console.log("Sliding from page", prev, "to page", next);
                    return next;
                });
            }, 5000); // 5초마다 슬라이드

            return () => clearInterval(interval);
        }
    }, [reviews.length]);
    return (
        <>
            <Header />
            <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-10">
                {/* 히어로 섹션 */}
                <section className="pt-24 pb-16 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="mb-6">
                            <span className="text-6xl">📦</span>
                        </div>
                        <h1 className="text-5xl font-bold text-gray-900 mb-6">여행, 이제 직접 안 짜도 돼요</h1>
                        <p className="text-2xl font-semibold text-blue-600 mb-4">
                            밀키트처럼 꺼내 먹는 여행 코스, StyleMap
                        </p>
                        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                            여행 계획하기 귀찮으시죠? StyleMap이 여러분을 위한 완벽한 여행 코스를 준비해드립니다. 컨셉과
                            카테고리만 선택하면 바로 출발할 수 있어요!
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">💕 커플</div>
                            <div className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold">👨‍👩‍👧‍👦 가족</div>
                            <div className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold">👥 친구</div>
                            <div className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold">☕ 카페</div>
                            <div className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold">🍽️ 맛집</div>
                            <div className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold">🌿 힐링</div>
                        </div>
                    </div>
                </section>

                {/* 사회적 증거 섹션 */}
                <section className="py-12 px-4 bg-white">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-blue-600 mb-2">213+</div>
                                <div className="text-gray-600">지금까지 여행을 떠난 사용자</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-purple-600 mb-2">4.7★</div>
                                <div className="text-gray-600">평균 사용자 만족도</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-green-600 mb-2">
                                    {loading ? "..." : `${courseCount}개`}
                                </div>
                                <div className="text-gray-600">검증된 완벽한 코스</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 서비스 설명 섹션 */}
                <section className="py-16 px-4 bg-gray-50">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                            이렇게 간단해요! 3단계로 완성되는 여행
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* 1단계 */}
                            <div className="text-center p-6 rounded-xl bg-white shadow-lg">
                                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">1️⃣</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">컨셉 선택</h3>
                                <p className="text-gray-600">커플, 가족, 친구 중에서 누구와 함께 여행할지 선택하세요</p>
                            </div>

                            {/* 2단계 */}
                            <div className="text-center p-6 rounded-xl bg-white shadow-lg">
                                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">2️⃣</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">AI 코스 추천</h3>
                                <p className="text-gray-600">
                                    AI가 여러분의 취향, 현재 날씨, 이동 동선을 분석해서 완벽한 여행 코스를 추천해드려요
                                </p>
                            </div>

                            {/* 3단계 */}
                            <div className="text-center p-6 rounded-xl bg-white shadow-lg">
                                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">3️⃣</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">바로 여행 출발</h3>
                                <p className="text-gray-600">지도에서 코스를 확인하고 바로 여행을 시작하세요!</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 예시 코스 미리보기 */}
                <section className="py-16 px-4 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                            이런 코스들이 준비되어 있어요
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                // 로딩 중일 때 스켈레톤 UI
                                Array.from({ length: 3 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse"
                                    >
                                        <div className="h-48 bg-gray-300"></div>
                                        <div className="p-6">
                                            <div className="h-6 bg-gray-300 rounded mb-2"></div>
                                            <div className="h-4 bg-gray-300 rounded mb-4"></div>
                                            <div className="h-4 bg-gray-300 rounded mb-3"></div>
                                            <div className="h-4 bg-gray-300 rounded"></div>
                                        </div>
                                    </div>
                                ))
                            ) : courses.length > 0 ? (
                                // 실제 코스 데이터 표시
                                courses.map((course, index) => {
                                    // 컨셉에 따른 이모지와 그라데이션 색상 결정
                                    const getEmojiAndGradient = (concept: string) => {
                                        switch (concept?.toLowerCase()) {
                                            case "커플":
                                            case "couple":
                                                return { emoji: "💕", gradient: "from-pink-400 to-red-400" };
                                            case "가족":
                                            case "family":
                                                return { emoji: "👨‍👩‍👧‍👦", gradient: "from-green-400 to-blue-400" };
                                            case "친구":
                                            case "friend":
                                                return { emoji: "👥", gradient: "from-orange-400 to-yellow-400" };
                                            default:
                                                return { emoji: "🎯", gradient: "from-blue-400 to-purple-400" };
                                        }
                                    };

                                    const { emoji, gradient } = getEmojiAndGradient(course.concept);

                                    return (
                                        <div
                                            key={course.id}
                                            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                                            onClick={() => (window.location.href = `/courses/${course.id}`)}
                                        >
                                            {/* 이미지 섹션 */}
                                            <div className="h-48 relative">
                                                <img
                                                    src={
                                                        course.imageUrl ||
                                                        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=200&fit=crop"
                                                    }
                                                    alt={course.title}
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* 컨셉 라벨 */}
                                                <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                                    {course.concept || "코스"}
                                                </div>
                                            </div>

                                            {/* 정보 섹션 */}
                                            <div className="p-4">
                                                {/* 제목과 평점 */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="text-lg font-bold text-gray-900 truncate flex-1 mr-2">
                                                        {course.title}
                                                    </h3>
                                                    <div className="flex items-center text-sm text-yellow-500">
                                                        <span>⭐</span>
                                                        <span className="ml-1">
                                                            {course.rating || 4.5} ({course.reviewCount || 0})
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 설명 */}
                                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                    {course.description || "완벽한 여행 코스"}
                                                </p>

                                                {/* 정보 배지들 */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs flex items-center">
                                                        <span className="mr-1">⏰</span>
                                                        <span>{course.duration || "4시간"}</span>
                                                    </div>
                                                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs flex items-center">
                                                        <span className="mr-1">📍</span>
                                                        <span>{course.location || "서울"}</span>
                                                    </div>
                                                    {course.price && (
                                                        <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs flex items-center">
                                                            <span className="mr-1">💰</span>
                                                            <span>{course.price}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 참여자 수와 시작 버튼 */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <span className="mr-1">👥</span>
                                                        <span>지금 {course.participants || 0}명 진행중</span>
                                                    </div>
                                                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                                                        코스 시작하기
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                // 코스가 없을 때
                                <div className="col-span-full text-center py-12">
                                    <div className="text-6xl mb-4">📦</div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">아직 준비 중인 코스</h3>
                                    <p className="text-gray-600">곧 멋진 여행 코스들이 준비될 예정입니다!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 사용자 후기 섹션 */}
                <section className="py-16 px-4 bg-gray-50">
                    <div className="max-w-6xl mx-auto text-black">
                        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                            실제 사용자들의 생생한 후기
                        </h2>
                        <div className="relative">
                            {/* 슬라이드 컨테이너 */}
                            <div className="overflow-hidden">
                                <div
                                    className="flex transition-transform duration-500 ease-in-out"
                                    style={{ transform: `translateX(-${currentReviewPage * 100}%)` }}
                                >
                                    {/* 3개씩 3페이지로 나누기 */}
                                    {[0, 1, 2].map((pageIndex) => (
                                        <div key={pageIndex} className="w-full flex-shrink-0">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {loading
                                                    ? // 로딩 중일 때 스켈레톤 UI
                                                      Array.from({ length: 3 }).map((_, index) => (
                                                          <div
                                                              key={index}
                                                              className="bg-white p-6 rounded-xl shadow-lg animate-pulse"
                                                          >
                                                              <div className="flex items-center mb-4">
                                                                  <div className="w-12 h-12 bg-gray-300 rounded-full mr-3"></div>
                                                                  <div className="flex-1">
                                                                      <div className="h-4 bg-gray-300 rounded mb-2"></div>
                                                                      <div className="h-3 bg-gray-300 rounded"></div>
                                                                  </div>
                                                              </div>
                                                              <div className="h-4 bg-gray-300 rounded mb-2"></div>
                                                              <div className="h-4 bg-gray-300 rounded mb-2"></div>
                                                              <div className="h-4 bg-gray-300 rounded mb-3"></div>
                                                              <div className="h-4 bg-gray-300 rounded"></div>
                                                          </div>
                                                      ))
                                                    : reviews
                                                          .slice(pageIndex * 3, (pageIndex + 1) * 3)
                                                          .map((review, index) => {
                                                              // 컨셉에 따른 색상 결정
                                                              const getColorByConcept = (concept: string) => {
                                                                  switch (concept?.toLowerCase()) {
                                                                      case "커플":
                                                                      case "couple":
                                                                          return {
                                                                              bg: "bg-blue-100",
                                                                              text: "text-blue-600",
                                                                          };
                                                                      case "가족":
                                                                      case "family":
                                                                          return {
                                                                              bg: "bg-purple-100",
                                                                              text: "text-purple-600",
                                                                          };
                                                                      case "친구":
                                                                      case "friend":
                                                                          return {
                                                                              bg: "bg-green-100",
                                                                              text: "text-green-600",
                                                                          };
                                                                      default:
                                                                          return {
                                                                              bg: "bg-gray-100",
                                                                              text: "text-gray-600",
                                                                          };
                                                                  }
                                                              };

                                                              const { bg, text } = getColorByConcept(
                                                                  review.course.concept
                                                              );

                                                              return (
                                                                  <div
                                                                      key={review.id}
                                                                      className="bg-white p-6 rounded-xl shadow-lg"
                                                                  >
                                                                      <div className="flex items-center mb-4">
                                                                          <div
                                                                              className={`w-12 h-12 ${bg} rounded-full flex items-center justify-center mr-3`}
                                                                          >
                                                                              <span className={`font-semibold ${text}`}>
                                                                                  {review.user.initial}
                                                                              </span>
                                                                          </div>
                                                                          <div>
                                                                              <div className="font-semibold">
                                                                                  {review.user.nickname}
                                                                              </div>
                                                                              <div className="text-sm text-gray-500">
                                                                                  {review.course.title}
                                                                              </div>
                                                                          </div>
                                                                      </div>
                                                                      <p className="text-gray-600 mb-3">
                                                                          "{review.comment}"
                                                                      </p>
                                                                      <div className="text-yellow-400">
                                                                          {"⭐".repeat(review.rating)}
                                                                      </div>
                                                                  </div>
                                                              );
                                                          })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 페이지 인디케이터 */}
                            <div className="flex justify-center mt-8 space-x-2">
                                {[0, 1, 2].map((index) => (
                                    <div
                                        key={index}
                                        className={`w-3 h-3 rounded-full transition-colors ${
                                            currentReviewPage === index ? "bg-blue-600" : "bg-gray-300"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 왜 StyleMap인가요? */}
                <section className="py-16 px-4 bg-white">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">왜 StyleMap인가요?</h2>
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                                        여행 계획하기 너무 귀찮으시죠?
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        "어디 갈까?", "뭐 먹을까?", "길 찾기 어려워..." 이런 고민들, 이제 그만!
                                    </p>
                                    <p className="text-gray-600 mb-4">
                                        StyleMap은 여러분이 직접 여행 계획을 짤 필요 없이, 이미 검증된 완벽한 코스를
                                        밀키트처럼 제공해드립니다.
                                    </p>
                                    <p className="text-gray-600">
                                        컨셉과 카테고리만 선택하면 AI가 여러분을 위한 최적의 여행 코스를 만들어드려요!
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="w-48 h-48 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                                        <span className="text-6xl">🎯</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA 섹션 */}
                <section className="py-16 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">지금 바로 여행을 시작해보세요!</h2>
                        <p className="text-xl text-gray-600 mb-8">
                            복잡한 계획 없이, 밀키트처럼 간편하게 완벽한 여행을 경험해보세요.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <a
                                href="/personalized-home"
                                className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
                            >
                                🎯 AI 추천 바로 가기
                            </a>
                            <a
                                href="/map"
                                className="bg-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-lg"
                            >
                                🗺️ 지도에서 탐색하기
                            </a>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
};

export default AboutPage;
