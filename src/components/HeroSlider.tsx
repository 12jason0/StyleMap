"use client";

import React, { useState } from "react";
import Image from "next/image";

export type SliderItem = {
    id: string;
    imageUrl?: string;
    location?: string;
    concept?: string;
    tags?: string[];
};

type HeroSliderProps = {
    items: SliderItem[];
};

export default function HeroSlider({ items }: HeroSliderProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchDeltaX, setTouchDeltaX] = useState(0);
    const [isTouching, setIsTouching] = useState(false);

    return (
        <section className="relative px-4 pt-10">
            <div
                className="relative h-[200px] overflow-hidden shadow-xl cursor-grab select-none"
                style={{
                    transform: `translateX(${touchDeltaX * 0.15}px)`,
                    transition: isTouching ? "none" : "transform 300ms ease",
                }}
                onTouchStart={(e) => {
                    if (e.touches && e.touches.length > 0) {
                        setTouchStartX(e.touches[0].clientX);
                        setTouchDeltaX(0);
                        setIsTouching(true);
                    }
                }}
                onTouchMove={(e) => {
                    if (touchStartX !== null && e.touches && e.touches.length > 0) {
                        setTouchDeltaX(e.touches[0].clientX - touchStartX);
                    }
                }}
                onTouchEnd={() => {
                    const threshold = 40;
                    const total = items.length > 0 ? Math.min(5, items.length) : 0;
                    if (total === 0) return;
                    if (touchDeltaX > threshold) {
                        setCurrentSlide((prev) => (prev - 1 + total) % total);
                    } else if (touchDeltaX < -threshold) {
                        setCurrentSlide((prev) => (prev + 1) % total);
                    }
                    setTouchStartX(null);
                    setTouchDeltaX(0);
                    setIsTouching(false);
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    setTouchStartX(e.clientX);
                    setTouchDeltaX(0);
                    setIsTouching(true);
                }}
                onMouseMove={(e) => {
                    if (isTouching && touchStartX !== null) {
                        setTouchDeltaX(e.clientX - touchStartX);
                    }
                }}
                onMouseLeave={() => {
                    if (!isTouching) return;
                    const threshold = 40;
                    const total = items.length > 0 ? Math.min(5, items.length) : 0;
                    if (total !== 0) {
                        if (touchDeltaX > threshold) {
                            setCurrentSlide((prev) => (prev - 1 + total) % total);
                        } else if (touchDeltaX < -threshold) {
                            setCurrentSlide((prev) => (prev + 1) % total);
                        }
                    }
                    setTouchStartX(null);
                    setTouchDeltaX(0);
                    setIsTouching(false);
                }}
                onMouseUp={() => {
                    if (!isTouching) return;
                    const threshold = 40;
                    const total = items.length > 0 ? Math.min(5, items.length) : 0;
                    if (total !== 0) {
                        if (touchDeltaX > threshold) {
                            setCurrentSlide((prev) => (prev - 1 + total) % total);
                        } else if (touchDeltaX < -threshold) {
                            setCurrentSlide((prev) => (prev + 1) % total);
                        }
                    }
                    setTouchStartX(null);
                    setTouchDeltaX(0);
                    setIsTouching(false);
                }}
            >
                <div className="absolute inset-0">
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className={`absolute inset-0 transition-all duration-1000 ${
                                index === currentSlide ? "opacity-100 z-20" : "opacity-100 z-10"
                            }`}
                        >
                            <div className="absolute inset-0">
                                {item.imageUrl ? (
                                    <Image
                                        src={item.imageUrl}
                                        alt={item.location || "slide"}
                                        fill
                                        priority={index === currentSlide}
                                        // 이미지가 컨테이너 좌우 패딩(px-4 → 1rem * 2)으로 전체 2rem이 줄어듭니다.
                                        sizes="(max-width: 1280px) calc(100vw - 2rem), 1280px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white" />
                                )}
                                <div className="absolute inset-0 bg-black/50" />
                            </div>
                            <div className="absolute bottom-6 right-6 left-6 text-right">
                                <h2 className="text-white font-extrabold text-3xl leading-tight drop-shadow-md">
                                    {item.location}
                                </h2>
                                <div className="text-white/90 text-sm mt-3 opacity-90">
                                    #{item.concept}
                                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                                        <>
                                            {" "}
                                            {item.tags.slice(0, 3).map((t) => (
                                                <span key={t} className="ml-2">
                                                    #{t}
                                                </span>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="absolute bottom-4 left-4 z-30">
                                <span className="px-3 py-1 rounded-full bg-black/60 text-white text-sm font-semibold">
                                    {currentSlide + 1}/{items.length || 1}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
