"use client";

import React from "react";

type FrameRect = {
    x: number; // left
    y: number; // top
    w: number; // width
    h: number; // height
};

export type FrameTemplate = {
    id?: number | string;
    image_url?: string | null; // backend style
    imageUrl?: string | null; // frontend style
    frames_json?: string | FrameRect[] | null; // backend style
    framesJson?: string | FrameRect[] | null; // frontend style
    // 새로 추가: 프레임 내부 활성 영역(테두리 제외) — px 또는 0~1 비율
    content_bounds?: string | { x: number; y: number; w: number; h: number } | null;
    contentBounds?: string | { x: number; y: number; w: number; h: number } | null;
    width?: number; // px (선택)
    height?: number; // px (선택)
};

function parseFrames(template: FrameTemplate): FrameRect[] {
    const raw = (template.frames_json ?? template.framesJson) as any;
    let arr: FrameRect[] = [];
    if (Array.isArray(raw)) {
        arr = raw as FrameRect[];
    } else if (typeof raw === "string" && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) arr = parsed as FrameRect[];
        } catch {}
    }
    return Array.isArray(arr)
        ? arr.filter((f) => isFinite(f.x) && isFinite(f.y) && isFinite(f.w) && isFinite(f.h))
        : [];
}

function toPxOrKeepPercent(fr: FrameRect, baseW: number, baseH: number): FrameRect {
    const isPercent = fr.x <= 1 && fr.y <= 1 && fr.w <= 1 && fr.h <= 1;
    if (!isPercent) return fr;
    return {
        x: Math.round(fr.x * baseW),
        y: Math.round(fr.y * baseH),
        w: Math.round(fr.w * baseW),
        h: Math.round(fr.h * baseH),
    };
}

function parseContentBounds(template: FrameTemplate, baseW: number, baseH: number): FrameRect | null {
    const raw = (template.content_bounds ?? template.contentBounds) as any;
    let obj: any = null;
    if (!raw) return null;
    if (typeof raw === "string") {
        try {
            obj = JSON.parse(raw);
        } catch {
            obj = null;
        }
    } else if (typeof raw === "object") obj = raw;
    if (!obj) return null;
    const isPercent = obj.x <= 1 && obj.y <= 1 && obj.w <= 1 && obj.h <= 1;
    return isPercent
        ? {
              x: Math.round(obj.x * baseW),
              y: Math.round(obj.y * baseH),
              w: Math.round(obj.w * baseW),
              h: Math.round(obj.h * baseH),
          }
        : { x: Math.round(obj.x), y: Math.round(obj.y), w: Math.round(obj.w), h: Math.round(obj.h) };
}

export default function FrameRenderer({
    template,
    photos,
    className,
    style,
    paddingRatio = 0.08,
}: {
    template: FrameTemplate;
    photos: Array<string | undefined | null>;
    className?: string;
    style?: React.CSSProperties;
    paddingRatio?: number;
}) {
    // 고정 해상도 (요청사항): 1080 x 1920
    const BASE_W = 1080;
    const BASE_H = 1920;

    const frames = parseFrames(template);
    const baseW = BASE_W;
    const baseH = BASE_H;
    const bg = template.image_url ?? template.imageUrl ?? undefined;
    const content = parseContentBounds(template, baseW, baseH);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", ...style }} className={className}>
            {bg && (
                <img
                    src={bg}
                    alt="frame"
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "fill", // 고정 해상도(1080x1920)에 정확히 맞춤
                        zIndex: 1,
                    }}
                />
            )}
            {frames.map((f, i) => {
                // 좌표는 컨텐트 영역 기준으로 해석한 뒤 전체 이미지 좌표로 변환
                const inner = content ?? { x: 0, y: 0, w: baseW, h: baseH };
                const rel = toPxOrKeepPercent(f, inner.w, inner.h);
                const r = { x: inner.x + rel.x, y: inner.y + rel.y, w: rel.w, h: rel.h };
                const src = photos[i] || undefined;
                if (!src) return null;
                const pad = Math.round(Math.min(r.w, r.h) * paddingRatio);
                const leftPct = ((r.x + pad) / baseW) * 100;
                const topPct = ((r.y + pad) / baseH) * 100;
                const widthPct = (Math.max(0, r.w - pad * 2) / baseW) * 100;
                const heightPct = (Math.max(0, r.h - pad * 2) / baseH) * 100;
                return (
                    <img
                        key={i}
                        src={src}
                        alt={`photo-${i + 1}`}
                        style={{
                            position: "absolute",
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: `${widthPct}%`,
                            height: `${heightPct}%`,
                            objectFit: "cover",
                            zIndex: 2,
                        }}
                    />
                );
            })}
        </div>
    );
}
