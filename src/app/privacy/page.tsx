"use client";

import React, { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PrivacyPolicyPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">개인정보처리방침</h1>

                    <div className="prose prose-lg max-w-none">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                            <p className="text-sm text-yellow-800">
                                ⚠️ 매우 중요: 아래 내용은 일반적인 예시(템플릿)이며 법적 효력을 보장하지 않습니다. 실제
                                서비스에 적용하기 전에는 반드시 법률 전문가의 검토를 받으셔야 합니다.
                            </p>
                        </div>

                        <p className="text-gray-700 mb-6">
                            [주식회사 스타일맵](이하 '회사')은(는) 정보통신망 이용촉진 및 정보보호 등에 관한 법률,
                            개인정보보호법 등 관련 법령상의 개인정보보호 규정을 준수하며, 관련 법령에 의거한
                            개인정보처리방침을 정하여 이용자 권익 보호에 최선을 다하고 있습니다.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                            제1조 (개인정보의 수집 항목 및 이용 목적)
                        </h2>
                        <p className="text-gray-700 mb-4">
                            회사는 회원가입, 원활한 고객상담, 각종 서비스의 제공을 위해 최초 회원가입 당시 아래와 같은
                            최소한의 개인정보를 필수항목으로 수집하고 있습니다.
                        </p>
                        <ul className="list-disc pl-6 mb-4 text-gray-700">
                            <li>수집 항목: 이메일, 비밀번호, 닉네임, 서비스 이용 기록, 접속 로그, 쿠키</li>
                            <li>이용 목적: 회원 식별, 서비스 제공, 문의 응대, 신규 서비스 개발 및 마케팅 활용</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                            제2조 (개인정보의 처리 및 보유 기간)
                        </h2>
                        <p className="text-gray-700 mb-4">
                            회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은
                            보유·이용기간 내에서 개인정보를 처리 및 보유합니다.
                        </p>
                        <ul className="list-disc pl-6 mb-4 text-gray-700">
                            <li>회원 정보: 회원 탈퇴 시까지</li>
                            <li>관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우: 해당 수사·조사 종료 시까지</li>
                            <li>서비스 이용에 따른 채권·채무관계 잔존 시: 해당 채권·채무관계 정산 시까지</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제9조 (개인정보 보호책임자)</h2>
                        <p className="text-gray-700 mb-4">
                            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만
                            처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg mb-6">
                            <p className="text-gray-700">
                                <strong>성명:</strong> [홍길동]
                            </p>
                            <p className="text-gray-700">
                                <strong>직책:</strong> [대표]
                            </p>
                            <p className="text-gray-700">
                                <strong>연락처:</strong> [041-123-4567], privacy@stylemap.com
                            </p>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">부칙</h2>
                        <p className="text-gray-700">본 개인정보처리방침은 2025년 8월 31일부터 적용됩니다.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PrivacyPolicyPage;
