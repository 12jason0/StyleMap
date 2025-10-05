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
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [adminAuthed, setAdminAuthed] = useState<boolean>(false);
    const [adminAuthLoading, setAdminAuthLoading] = useState<boolean>(true);
    const [adminPass, setAdminPass] = useState<string>("");
    const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

    const [newCourse, setNewCourse] = useState<NewCourse>({
        title: "",
        description: "",
        duration: "",
        location: "",
        price: "",
        imageUrl: "",
        concept: "",
    });

    // Edit course state
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [editCourse, setEditCourse] = useState<NewCourse>({
        title: "",
        description: "",
        duration: "",
        location: "",
        price: "",
        imageUrl: "",
        concept: "",
    });
    const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

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
    const [editingPlaceId, setEditingPlaceId] = useState<number | null>(null);
    const [editPlace, setEditPlace] = useState<NewPlace>({
        name: "",
        address: "",
        description: "",
        category: "",
        latitude: undefined,
        longitude: undefined,
        imageUrl: "",
        tags: "",
    });
    const [deletingPlaceId, setDeletingPlaceId] = useState<number | null>(null);

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
            const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID || "1"; // 기본 1번 유저
            const userRaw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
            const user = userRaw ? JSON.parse(userRaw) : null;
            setIsAdmin(!!user && String(user.id) === String(adminId));
        } catch {
            setIsAuthed(false);
            setIsAdmin(false);
        }
        fetchCourses();
        fetchPlaces();
    }, []);

    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch("/api/admin/auth", { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                setAdminAuthed(!!data?.authenticated);
            } finally {
                setAdminAuthLoading(false);
            }
        };
        check();
    }, []);

    useEffect(() => {
        if (adminAuthed) {
            setIsAdmin(true);
        }
    }, [adminAuthed]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewCourse((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditCourse((prev) => ({ ...prev, [name]: value }));
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

    const handleEditPlaceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditPlace((prev) => ({
            ...prev,
            [name]: name === "latitude" || name === "longitude" ? (value === "" ? undefined : Number(value)) : value,
        }));
    };

    const handleStartEditCourse = (course: Course) => {
        setEditingCourseId(course.id);
        setEditCourse({
            title: course.title || "",
            description: course.description || "",
            duration: course.duration || "",
            location: course.location || "",
            price: course.price || "",
            imageUrl: course.imageUrl || "",
            concept: course.concept || "",
        });
    };

    const handleCancelEditCourse = () => {
        setEditingCourseId(null);
    };

    const handleUpdateCourse = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingCourseId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
            if (!token) {
                alert("로그인이 필요합니다. 먼저 로그인해주세요.");
                setIsSubmitting(false);
                return;
            }
            const res = await fetch(`/api/courses/${editingCourseId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: editCourse.title,
                    description: editCourse.description,
                    duration: editCourse.duration,
                    location: editCourse.location,
                    imageUrl: editCourse.imageUrl,
                    concept: editCourse.concept,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "코스 수정에 실패했습니다.");
            setEditingCourseId(null);
            await fetchCourses();
            alert("코스가 수정되었습니다.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "코스 수정 중 오류 발생");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!confirm("정말 이 코스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
        setDeletingCourseId(courseId);
        setError(null);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
            if (!token) {
                alert("로그인이 필요합니다. 먼저 로그인해주세요.");
                setDeletingCourseId(null);
                return;
            }
            const res = await fetch(`/api/courses/${courseId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "코스 삭제에 실패했습니다.");
            await fetchCourses();
            alert("코스가 삭제되었습니다.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "코스 삭제 중 오류 발생");
        } finally {
            setDeletingCourseId(null);
        }
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

    const handleStartEditPlace = (p: Place) => {
        setEditingPlaceId(p.id);
        setEditPlace({
            name: p.name || "",
            address: p.address || "",
            description: p.description || "",
            category: p.category || "",
            latitude: p.latitude ?? undefined,
            longitude: p.longitude ?? undefined,
            imageUrl: p.imageUrl || "",
            tags: p.tags || "",
        });
    };

    const handleCancelEditPlace = () => {
        setEditingPlaceId(null);
    };

    const handleUpdatePlace = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingPlaceId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
            if (!token) {
                alert("로그인이 필요합니다. 먼저 로그인해주세요.");
                setIsSubmitting(false);
                return;
            }
            const res = await fetch(`/api/places/${editingPlaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(editPlace),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "장소 수정에 실패했습니다.");
            setEditingPlaceId(null);
            await fetchPlaces();
            alert("장소가 수정되었습니다.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "장소 수정 중 오류 발생");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePlace = async (placeId: number) => {
        if (!confirm("정말 이 장소를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
        setDeletingPlaceId(placeId);
        setError(null);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
            if (!token) {
                alert("로그인이 필요합니다. 먼저 로그인해주세요.");
                setDeletingPlaceId(null);
                return;
            }
            const res = await fetch(`/api/places/${placeId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "장소 삭제에 실패했습니다.");
            await fetchPlaces();
            alert("장소가 삭제되었습니다.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "장소 삭제 중 오류 발생");
        } finally {
            setDeletingPlaceId(null);
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

    const handleAdminLogin = async (e: FormEvent) => {
        e.preventDefault();
        setAdminAuthError(null);
        try {
            const res = await fetch("/api/admin/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: adminPass }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || "인증 실패");
            }
            setAdminAuthed(true);
            setAdminPass("");
        } catch (err) {
            setAdminAuthError(err instanceof Error ? err.message : "인증 실패");
        }
    };

    const handleAdminLogout = async () => {
        await fetch("/api/admin/auth", { method: "DELETE" });
        setAdminAuthed(false);
    };

    return (
        <>
            <main className="max-w-7xl mx-auto px-4 py-8 pt-24 text-black">
                {adminAuthLoading ? (
                    <div className="text-center text-gray-600">관리자 인증 확인 중...</div>
                ) : !adminAuthed ? (
                    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-900">관리자 인증</h2>
                        <p className="text-sm text-gray-600 mb-4">비밀번호를 입력해 관리자 페이지에 접속하세요.</p>
                        {adminAuthError && (
                            <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                                {adminAuthError}
                            </div>
                        )}
                        <form onSubmit={handleAdminLogin} className="space-y-4">
                            <input
                                type="password"
                                value={adminPass}
                                onChange={(e) => setAdminPass(e.target.value)}
                                placeholder="관리자 비밀번호"
                                className="w-full px-4 py-2 border rounded-lg"
                                required
                            />
                            <button
                                type="submit"
                                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-black"
                            >
                                접속하기
                            </button>
                        </form>
                    </div>
                ) : null}

                {adminAuthed && (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">관리자 페이지</h1>
                            <button
                                onClick={handleAdminLogout}
                                className="px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                            >
                                관리자 잠금
                            </button>
                        </div>

                        {!isAuthed && (
                            <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                                이 페이지에서 코스를 생성하려면 먼저 로그인해야 합니다. 상단의 로그인 메뉴를
                                이용해주세요.
                            </div>
                        )}

                        {true && (
                            <div className="bg-white p-8 rounded-2xl shadow-lg mb-12">
                                <h2 className="text-2xl font-semibold mb-6">
                                    {editingCourseId ? "코스 수정하기" : "새 코스 추가하기"}
                                </h2>
                                {error && <p className="text-red-500 mb-4">오류: {error}</p>}
                                <form
                                    onSubmit={editingCourseId ? handleUpdateCourse : handleSubmit}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                                >
                                    <div className="md:col-span-2">
                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                            코스 제목 *
                                        </label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={editingCourseId ? editCourse.title : newCourse.title}
                                            onChange={editingCourseId ? handleEditInputChange : handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label
                                            htmlFor="description"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                            설명
                                        </label>
                                        <textarea
                                            name="description"
                                            value={editingCourseId ? editCourse.description : newCourse.description}
                                            onChange={editingCourseId ? handleEditInputChange : handleInputChange}
                                            rows={3}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="duration"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                            소요 시간 (예: 3시간)
                                        </label>
                                        <input
                                            type="text"
                                            name="duration"
                                            value={editingCourseId ? editCourse.duration : newCourse.duration}
                                            onChange={editingCourseId ? handleEditInputChange : handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="location"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                            지역 (예: 성수동)
                                        </label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={editingCourseId ? editCourse.location : newCourse.location}
                                            onChange={editingCourseId ? handleEditInputChange : handleInputChange}
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
                                            value={editingCourseId ? editCourse.price : newCourse.price}
                                            onChange={editingCourseId ? handleEditInputChange : handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="concept"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                            컨셉 (예: 핫플투어)
                                        </label>
                                        <input
                                            type="text"
                                            name="concept"
                                            value={editingCourseId ? editCourse.concept : newCourse.concept}
                                            onChange={editingCourseId ? handleEditInputChange : handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label
                                            htmlFor="imageUrl"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                            대표 이미지 URL
                                        </label>
                                        <input
                                            type="text"
                                            name="imageUrl"
                                            value={editingCourseId ? editCourse.imageUrl : newCourse.imageUrl}
                                            onChange={editingCourseId ? handleEditInputChange : handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex justify-end gap-3">
                                        {editingCourseId && (
                                            <button
                                                type="button"
                                                onClick={handleCancelEditCourse}
                                                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                                            >
                                                취소
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                                        >
                                            {isSubmitting
                                                ? "저장 중..."
                                                : editingCourseId
                                                ? "코스 수정하기"
                                                : "코스 추가하기"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {true && (
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
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                        관리
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {courses.map((course) => (
                                                    <tr key={course.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            {course.id}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            {course.title}
                                                            {/* Mobile actions */}
                                                            <div className="mt-2 flex gap-2 md:hidden">
                                                                <button
                                                                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                                                                    onClick={() => handleStartEditCourse(course)}
                                                                >
                                                                    수정
                                                                </button>
                                                                <button
                                                                    className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
                                                                    disabled={deletingCourseId === course.id}
                                                                    onClick={() => handleDeleteCourse(course.id)}
                                                                >
                                                                    {deletingCourseId === course.id
                                                                        ? "삭제 중..."
                                                                        : "삭제"}
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            {course.concept}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            {course.location}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right hidden md:table-cell">
                                                            <button
                                                                className="mr-2 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                                                                onClick={() => handleStartEditCourse(course)}
                                                            >
                                                                수정
                                                            </button>
                                                            <button
                                                                className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
                                                                disabled={deletingCourseId === course.id}
                                                                onClick={() => handleDeleteCourse(course.id)}
                                                            >
                                                                {deletingCourseId === course.id ? "삭제 중..." : "삭제"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- 새 장소 추가/수정 폼 --- */}
                        {true && (
                            <div className="bg-white p-8 rounded-2xl shadow-lg mt-12">
                                <h2 className="text-2xl font-semibold mb-6">
                                    {editingPlaceId ? "장소 수정하기" : "새 장소 추가하기"}
                                </h2>
                                {error && <p className="text-red-500 mb-4">오류: {error}</p>}
                                <form
                                    onSubmit={editingPlaceId ? handleUpdatePlace : handleCreatePlace}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                                >
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            장소 이름 *
                                        </label>
                                        <input
                                            name="name"
                                            value={editingPlaceId ? editPlace.name : newPlace.name}
                                            onChange={editingPlaceId ? handleEditPlaceChange : handlePlaceChange}
                                            required
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
                                        <input
                                            name="address"
                                            value={editingPlaceId ? editPlace.address || "" : newPlace.address || ""}
                                            onChange={editingPlaceId ? handleEditPlaceChange : handlePlaceChange}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                                        <input
                                            name="category"
                                            value={editingPlaceId ? editPlace.category || "" : newPlace.category || ""}
                                            onChange={editingPlaceId ? handleEditPlaceChange : handlePlaceChange}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">위도</label>
                                        <input
                                            name="latitude"
                                            type="number"
                                            step="any"
                                            value={editingPlaceId ? editPlace.latitude ?? "" : newPlace.latitude ?? ""}
                                            onChange={editingPlaceId ? handleEditPlaceChange : handlePlaceChange}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">경도</label>
                                        <input
                                            name="longitude"
                                            type="number"
                                            step="any"
                                            value={
                                                editingPlaceId ? editPlace.longitude ?? "" : newPlace.longitude ?? ""
                                            }
                                            onChange={editingPlaceId ? handleEditPlaceChange : handlePlaceChange}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
                                        <textarea
                                            name="description"
                                            value={
                                                editingPlaceId
                                                    ? editPlace.description || ""
                                                    : newPlace.description || ""
                                            }
                                            onChange={editingPlaceId ? handleEditPlaceChange : handlePlaceChange}
                                            rows={3}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            이미지 URL
                                        </label>
                                        <input
                                            name="imageUrl"
                                            value={editingPlaceId ? editPlace.imageUrl || "" : newPlace.imageUrl || ""}
                                            onChange={editingPlaceId ? handleEditPlaceChange : handlePlaceChange}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            태그(쉼표 구분)
                                        </label>
                                        <input
                                            name="tags"
                                            value={editingPlaceId ? editPlace.tags || "" : newPlace.tags || ""}
                                            onChange={editingPlaceId ? handleEditPlaceChange : handlePlaceChange}
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex justify-end gap-3">
                                        {editingPlaceId && (
                                            <button
                                                type="button"
                                                onClick={handleCancelEditPlace}
                                                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                                            >
                                                취소
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
                                        >
                                            {isSubmitting
                                                ? "저장 중..."
                                                : editingPlaceId
                                                ? "장소 수정하기"
                                                : "장소 추가하기"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* --- 코스에 장소 배치 --- */}
                        {true && (
                            <div className="bg-white p-8 rounded-2xl shadow-lg mt-12">
                                <h2 className="text-2xl font-semibold mb-6">코스에 장소 배치하기</h2>
                                <form onSubmit={handleLinkPlace} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            코스 선택 *
                                        </label>
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
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            장소 선택 *
                                        </label>
                                        <select
                                            value={linkPlaceId === "" ? "" : String(linkPlaceId)}
                                            onChange={(e) =>
                                                setLinkPlaceId(e.target.value ? Number(e.target.value) : "")
                                            }
                                            required
                                            className="w-full px-4 py-2 border rounded-lg"
                                        >
                                            <option value="">장소 선택</option>
                                            {loadingPlaces ? (
                                                <option>로딩 중...</option>
                                            ) : (
                                                places.map((p) => (
                                                    <option key={p.id} value={p.id}>{`${p.id} - ${p.name}`}</option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            순서(1,2,3...) *
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={linkOrderIndex === "" ? "" : linkOrderIndex}
                                            onChange={(e) =>
                                                setLinkOrderIndex(e.target.value === "" ? "" : Number(e.target.value))
                                            }
                                            required
                                            className="w-full px-4 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            예상 소요(분)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={linkEstimatedDuration === "" ? "" : linkEstimatedDuration}
                                            onChange={(e) =>
                                                setLinkEstimatedDuration(
                                                    e.target.value === "" ? "" : Number(e.target.value)
                                                )
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
                        )}

                        {/* --- 장소 목록 (수정/삭제) --- */}
                        {true && (
                            <div className="bg-white p-8 rounded-2xl shadow-lg mt-12">
                                <h2 className="text-2xl font-semibold mb-6">장소 목록 ({places.length}개)</h2>
                                {loadingPlaces ? (
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
                                                        이름
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                        카테고리
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                        주소
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                        관리
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {places.map((p) => (
                                                    <tr key={p.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{p.id}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            {p.name}
                                                            {/* Mobile actions */}
                                                            <div className="mt-2 flex gap-2 md:hidden">
                                                                <button
                                                                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                                                                    onClick={() => handleStartEditPlace(p)}
                                                                >
                                                                    수정
                                                                </button>
                                                                <button
                                                                    className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
                                                                    disabled={deletingPlaceId === p.id}
                                                                    onClick={() => handleDeletePlace(p.id)}
                                                                >
                                                                    {deletingPlaceId === p.id ? "삭제 중..." : "삭제"}
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            {p.category}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            {p.address}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right hidden md:table-cell">
                                                            <button
                                                                className="mr-2 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                                                                onClick={() => handleStartEditPlace(p)}
                                                            >
                                                                수정
                                                            </button>
                                                            <button
                                                                className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
                                                                disabled={deletingPlaceId === p.id}
                                                                onClick={() => handleDeletePlace(p.id)}
                                                            >
                                                                {deletingPlaceId === p.id ? "삭제 중..." : "삭제"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
