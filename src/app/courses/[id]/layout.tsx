import type { Metadata } from "next";

// Next.js 15: 동적 라우트 params는 Promise로 전달됩니다.
type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { id } = await params; // 반드시 await 후 사용
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    try {
        const res = await fetch(`${baseUrl}/api/courses/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load course ${id}`);
        const data = await res.json();
        const title = data?.title ? `StyleMap | ${data.title}` : "StyleMap";
        const description: string = data?.description || "StyleMap 코스 상세";
        const image: string = data?.imageUrl || "";

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: "article",
                url: `${baseUrl}/courses/${id}`,
                images: image ? [{ url: image }] : undefined,
            },
            twitter: {
                card: "summary_large_image",
                title,
                description,
                images: image ? [image] : undefined,
            },
        };
    } catch {
        return {
            title: "StyleMap",
        };
    }
}

export default function CourseDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
