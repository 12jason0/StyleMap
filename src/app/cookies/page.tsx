"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CookiesPolicyPage = () => {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 bg-white">
                <h1 className="text-3xl font-bold mb-6">쿠키 정책</h1>
                <p>쿠키 사용에 대한 정책을 여기에 작성합니다.</p>
                {/* TODO: 실제 쿠키 정책 내용을 추가하세요 */}
            </main>
        </div>
    );
};

export default CookiesPolicyPage;
