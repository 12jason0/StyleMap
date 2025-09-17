import type { Metadata } from "next";

// Next.js 15: 동적 라우트 params는 Promise로 전달됩니다.
type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { id } = await params; // 반드시 await 후 사용
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    try {
        const res = await fetch(`${baseUrl}/api/escape/stories?storyId=${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load story ${id}`);
        const story = await res.json();

        if (!story) {
            return { title: "방탈출 미션" };
        }

        return {
            title: `${story.title} | 도심 속 이색 방탈출 미션`,
            description: `스타일맵과 함께하는 새로운 탈출 게임! ${story.synopsis || story.title}`,
            openGraph: {
                title: `${story.title} | 스타일맵`,
                description: story.synopsis || "도심 속에서 즐기는 새로운 탈출 게임을 경험해보세요.",
                type: "article",
                url: `${baseUrl}/escape/${id}`,
                images: story.imageUrl ? [{ url: story.imageUrl }] : undefined,
            },
            twitter: {
                card: "summary_large_image",
                title: `${story.title} | 스타일맵`,
                description: story.synopsis || "도심 속에서 즐기는 새로운 탈출 게임을 경험해보세요.",
                images: story.imageUrl ? [story.imageUrl] : undefined,
            },
        };
    } catch (error) {
        return {
            title: "방탈출 미션 | 스타일맵",
            description: "도심 속에서 즐기는 새로운 탈출 게임을 경험해보세요.",
        };
    }
}

export default function EscapeDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
