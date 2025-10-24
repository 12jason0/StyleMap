"use client";

import React from "react";
import FrameRenderer, { FrameTemplate } from "@/components/FrameRenderer";

export default function FramePreview({
    template,
    photos,
    className,
    style,
}: {
    template: FrameTemplate;
    photos: string[];
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <div
            className={className}
            style={{
                position: "relative",
                width: "100%", // 화면 너비에 맞게
                maxWidth: "400px", // 모바일 기준 제한
                aspectRatio: "9 / 16", // 1080:1920 비율 유지
                margin: "0 auto",
                overflow: "hidden", // 넘치면 잘라냄
                backgroundColor: "#000", // 프레임 바깥 배경색
                ...style,
            }}
        >
            <FrameRenderer template={template} photos={photos} />
        </div>
    );
}
