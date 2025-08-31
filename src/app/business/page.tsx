"use client";

import React, { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const BusinessPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">사업자 정보</h1>

                    <div className="prose prose-lg max-w-none">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                            <p className="text-sm text-yellow-800">
                                ⚠️ 위 정보는 모두 예시이므로, 반드시 본인의 실제 사업자 정보로 정확하게 기재해야 합니다.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-8">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">상호명</h3>
                                    <p className="text-gray-700">주식회사 스타일맵</p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">대표자</h3>
                                    <p className="text-gray-700">홍길동</p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">사업자등록번호</h3>
                                    <p className="text-gray-700">123-45-67890</p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">통신판매업신고번호</h3>
                                    <p className="text-gray-700">제2025-충남홍성-0001호</p>
                                </div>

                                <div className="md:col-span-2">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">사업장 주소</h3>
                                    <p className="text-gray-700">충청남도 홍성군 홍성읍 [상세주소]</p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">대표전화</h3>
                                    <p className="text-gray-700">041-123-4567</p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">이메일</h3>
                                    <p className="text-gray-700">contact@stylemap.com</p>
                                </div>

                                <div className="md:col-span-2">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">개인정보보호책임자</h3>
                                    <p className="text-gray-700">홍길동 (privacy@stylemap.com)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default BusinessPage;
