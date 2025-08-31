"use client";

import React, { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsOfServicePage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">이용약관</h1>

                    <div className="prose prose-lg max-w-none">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                            <p className="text-sm text-yellow-800">
                                ⚠️ 매우 중요: 아래 내용은 일반적인 예시(템플릿)이며 법적 효력을 보장하지 않습니다. 실제
                                서비스에 적용하기 전에는 반드시 법률 전문가의 검토를 받으셔야 합니다.
                            </p>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제1조 (목적)</h2>
                        <p className="text-gray-700 mb-6">
                            이 약관은 [주식회사 스타일맵](이하 '회사')이 제공하는 [StyleMap] 및 관련 제반 서비스(이하
                            '서비스')의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을
                            규정함을 목적으로 합니다.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제2조 (용어의 정의)</h2>
                        <ul className="list-disc pl-6 mb-6 text-gray-700">
                            <li>'서비스'라 함은 회사가 제공하는 모든 [StyleMap] 관련 서비스를 의미합니다.</li>
                            <li>
                                '회원'이라 함은 회사의 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결하고
                                회사가 제공하는 서비스를 이용하는 고객을 말합니다.
                            </li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제3조 (회원의 의무)</h2>
                        <p className="text-gray-700 mb-4">회원은 다음 행위를 하여서는 안 됩니다.</p>
                        <ul className="list-disc pl-6 mb-6 text-gray-700">
                            <li>신청 또는 변경 시 허위 내용의 등록</li>
                            <li>타인의 정보 도용</li>
                            <li>회사가 게시한 정보의 변경</li>
                            <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                            <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                            <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">부칙</h2>
                        <p className="text-gray-700">본 약관은 2025년 8월 31일부터 시행됩니다.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default TermsOfServicePage;
