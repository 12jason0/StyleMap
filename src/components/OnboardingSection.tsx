"use client";

import React from "react";

type Props = {
    onStart: () => void;
};

export default function OnboardingSection({ onStart }: Props) {
    return (
        <section className="py-8 pb-30">
            <div className="max-w-7xl mx-auto px-4">
                <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white border border-sky-100 p-6 md:p-8">
                    <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-sky-100 text-sky-700 text-2xl">
                            💫
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                                더 정확한 추천을 원하시나요?
                            </h3>
                            <p className="text-gray-600 mb-4">3분만 투자하면 완전히 다른 경험을 드릴게요</p>
                            <button
                                onClick={onStart}
                                className="hover:cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-colors"
                            >
                                내 취향 설정하기<span>→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}







