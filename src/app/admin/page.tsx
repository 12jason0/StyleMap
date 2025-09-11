"use client";

import { useEffect, useState, FormEvent } from "react";
import Header from "@/components/Header";

type Course = {
    id: string;
    title: string;
    description: string;
    duration: string;
    location: string;
    price: string;
    imageUrl: string;
    concept: string;
};

type NewCourse = Omit<Course, "id">;

type Place = {
    id: number;
    name: string;
    address?: string | null;
    description?: string | null;
    category?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    imageUrl?: string | null;
    tags?: string | null;
};

type NewPlace = Omit<Place, "id"> & { id?: never };

export default function AdminPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAuthed, setIsAuthed] = useState<boolean>(false);

    const [newCourse, setNewCourse] = useState<NewCourse>({
        title: "",
        description: "",
        duration: "",
        location: "",
        price: "",
        imageUrl: "",
        concept: "",
    });

    // Places
    const [places, setPlaces] = useState<Place[]>([]);
    const [loadingPlaces, setLoadingPlaces] = useState<boolean>(false);
    const [newPlace, setNewPlace] = useState<NewPlace>({
        name: "",
        address: "",
        description: "",
        category: "",
        latitude: undefined,
        longitude: undefined,
        imageUrl: "",
        tags: "",
    });

    // Course-Place linking
    const [linkCourseId, setLinkCourseId] = useState<string>("");
    const [linkPlaceId, setLinkPlaceId] = useState<number | "">("");
    const [linkOrderIndex, setLinkOrderIndex] = useState<number | "">("");
    const [linkEstimatedDuration, setLinkEstimatedDuration] = useState<number | "">("");
    const [linkRecommendedTime, setLinkRecommendedTime] = useState<string>("");
    const [linkNotes, setLinkNotes] = useState<string>("");

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/courses?limit=100&nocache=1");
            if (!response.ok) {
                throw new Error("데이터를 불러오는데 실패했습니다.");
            }
            const data = (await response.json()) as Course[];
            setCourses(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "알 수 없는 오류 발생");
        } finally {
            setLoading(false);
        }
    };

    const fetchPlaces = async () => {
        try {
            setLoadingPlaces(true);
            const res = await fetch("/api/places?all=1&limit=200", { cache: "no-store" });
            if (!res.ok) throw new Error("장소 목록을 불러오는데 실패했습니다.");
            const data = await res.json();
            setPlaces((data?.places as Place[]) || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "알 수 없는 오류 발생");
        } finally {
            setLoadingPlaces(false);
        }
    };

    useEffect(() => {
        // 간단한 인증 상태 확인 (로컬 스토리지 토큰 존재 여부)
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
            setIsAuthed(!!token);
        } catch {
            setIsAuthed(false);
        }
        fetchCourses();
        fetchPlaces();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewCourse((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
            if (!token) {
                alert("로그인이 필요합니다. 먼저 로그인 페이지에서 로그인해주세요.");
                setIsSubmitting(false);
                return;
            }

            const response = await fetch("/api/courses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newCourse),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "코스 추가에 실패했습니다.");
            }

            alert("새로운 코스가 성공적으로 추가되었습니다!");
            setNewCourse({
                title: "",
                description: "",
                duration: "",
                location: "",
                price: "",
                imageUrl: "",
                concept: "",
            });
            await fetchCourses();
        } catch (err) {
            setError(err instanceof Error ? err.message : "코스 추가 중 오류 발생");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePlaceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewPlace((prev) => ({
            ...prev,
            [name]: name === "latitude" || name === "longitude" ? (value === "" ? undefined : Number(value)) : value,
        }));
    };

    const handleCreatePlace = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
            if (!token) {
                alert("로그인이 필요합니다. 먼저 로그인해주세요.");
                setIsSubmitting(false);
                return;
            }

            const res = await fetch("/api/places", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(newPlace),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "장소 생성에 실패했습니다.");

            alert(`장소가 생성되었습니다. (ID: ${data.place?.id})`);
            setNewPlace({
                name: "",
                address: "",
                description: "",
                category: "",
                latitude: undefined,
                longitude: undefined,
                imageUrl: "",
                tags: "",
            });
            await fetchPlaces();
        } catch (err) {
            setError(err instanceof Error ? err.message : "장소 생성 중 오류 발생");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLinkPlace = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
            if (!token) {
                alert("로그인이 필요합니다. 먼저 로그인해주세요.");
                setIsSubmitting(false);
                return;
            }
            if (!linkCourseId || !linkPlaceId || !linkOrderIndex) {
                setError("코스, 장소, 순서는 필수입니다.");
                setIsSubmitting(false);
                return;
            }

            const res = await fetch(`/api/courses/${linkCourseId}/places`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    place_id: Number(linkPlaceId),
                    order_index: Number(linkOrderIndex),
                    estimated_duration: linkEstimatedDuration === "" ? undefined : Number(linkEstimatedDuration),
                    recommended_time: linkRecommendedTime || undefined,
                    notes: linkNotes || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "코스에 장소 추가 실패");

            alert("코스에 장소가 추가되었습니다.");
            setLinkOrderIndex("");
            setLinkEstimatedDuration("");
            setLinkRecommendedTime("");
            setLinkNotes("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "코스-장소 연결 중 오류 발생");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <main className="max-w-7xl mx-auto px-4 py-8 pt-24 text-black">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">관리자 페이지</h1>

                {!isAuthed && (
                    <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                        이 페이지에서 코스를 생성하려면 먼저 로그인해야 합니다. 상단의 로그인 메뉴를 이용해주세요.
                    </div>
                )}

                <div className="bg-white p-8 rounded-2xl shadow-lg mb-12">
                    <h2 className="text-2xl font-semibold mb-6">새 코스 추가하기</h2>
                    {error && <p className="text-red-500 mb-4">오류: {error}</p>}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                코스 제목 *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={newCourse.title}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                설명
                            </label>
                            <textarea
                                name="description"
                                value={newCourse.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-4 py-2 border rounded-lg"
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                                소요 시간 (예: 3시간)
                            </label>
                            <input
                                type="text"
                                name="duration"
                                value={newCourse.duration}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                                지역 (예: 성수동)
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={newCourse.location}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                                가격 (예: 30000원)
                            </label>
                            <input
                                type="text"
                                name="price"
                                value={newCourse.price}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="concept" className="block text-sm font-medium text-gray-700 mb-2">
                                컨셉 (예: 핫플투어)
                            </label>
                            <input
                                type="text"
                                name="concept"
                                value={newCourse.concept}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">
                                대표 이미지 URL
                            </label>
                            <input
                                type="text"
                                name="imageUrl"
                                value={newCourse.imageUrl}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="md:col-span-2 text-right">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {isSubmitting ? "저장 중..." : "코스 추가하기"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-6">현재 코스 목록 ({courses.length}개)</h2>
                    {loading ? (
                        <p>목록을 불러오는 중...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            제목
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            컨셉
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            지역
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {courses.map((course) => (
                                        <tr key={course.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{course.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {course.title}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{course.concept}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{course.location}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* --- 새 장소 추가 폼 --- */}
                <div className="bg-white p-8 rounded-2xl shadow-lg mt-12">
                    <h2 className="text-2xl font-semibold mb-6">새 장소 추가하기</h2>
                    {error && <p className="text-red-500 mb-4">오류: {error}</p>}
                    <form onSubmit={handleCreatePlace} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">장소 이름 *</label>
                            <input
                                name="name"
                                value={newPlace.name}
                                onChange={handlePlaceChange}
                                required
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
                            <input
                                name="address"
                                value={newPlace.address || ""}
                                onChange={handlePlaceChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                            <input
                                name="category"
                                value={newPlace.category || ""}
                                onChange={handlePlaceChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">위도</label>
                            <input
                                name="latitude"
                                type="number"
                                step="any"
                                value={newPlace.latitude ?? ""}
                                onChange={handlePlaceChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">경도</label>
                            <input
                                name="longitude"
                                type="number"
                                step="any"
                                value={newPlace.longitude ?? ""}
                                onChange={handlePlaceChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
                            <textarea
                                name="description"
                                value={newPlace.description || ""}
                                onChange={handlePlaceChange}
                                rows={3}
                                className="w-full px-4 py-2 border rounded-lg"
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">이미지 URL</label>
                            <input
                                name="imageUrl"
                                value={newPlace.imageUrl || ""}
                                onChange={handlePlaceChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">태그(쉼표 구분)</label>
                            <input
                                name="tags"
                                value={newPlace.tags || ""}
                                onChange={handlePlaceChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="md:col-span-2 text-right">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
                            >
                                {isSubmitting ? "저장 중..." : "장소 추가하기"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* --- 코스에 장소 배치 --- */}
                <div className="bg-white p-8 rounded-2xl shadow-lg mt-12">
                    <h2 className="text-2xl font-semibold mb-6">코스에 장소 배치하기</h2>
                    <form onSubmit={handleLinkPlace} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">코스 선택 *</label>
                            <select
                                value={linkCourseId}
                                onChange={(e) => setLinkCourseId(e.target.value)}
                                required
                                className="w-full px-4 py-2 border rounded-lg"
                            >
                                <option value="">코스 선택</option>
                                {courses.map((c) => (
                                    <option key={c.id} value={c.id}>{`${c.id} - ${c.title}`}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">장소 선택 *</label>
                            <select
                                value={linkPlaceId === "" ? "" : String(linkPlaceId)}
                                onChange={(e) => setLinkPlaceId(e.target.value ? Number(e.target.value) : "")}
                                required
                                className="w-full px-4 py-2 border rounded-lg"
                            >
                                <option value="">장소 선택</option>
                                {loadingPlaces ? (
                                    <option>로딩 중...</option>
                                ) : (
                                    places.map((p) => <option key={p.id} value={p.id}>{`${p.id} - ${p.name}`}</option>)
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">순서(1,2,3...) *</label>
                            <input
                                type="number"
                                min={1}
                                value={linkOrderIndex === "" ? "" : linkOrderIndex}
                                onChange={(e) => setLinkOrderIndex(e.target.value === "" ? "" : Number(e.target.value))}
                                required
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">예상 소요(분)</label>
                            <input
                                type="number"
                                min={0}
                                value={linkEstimatedDuration === "" ? "" : linkEstimatedDuration}
                                onChange={(e) =>
                                    setLinkEstimatedDuration(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                추천 시간대(예: 오후)
                            </label>
                            <input
                                value={linkRecommendedTime}
                                onChange={(e) => setLinkRecommendedTime(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">비고</label>
                            <input
                                value={linkNotes}
                                onChange={(e) => setLinkNotes(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="md:col-span-2 text-right">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400"
                            >
                                {isSubmitting ? "저장 중..." : "코스에 장소 추가"}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </>
    );
}
