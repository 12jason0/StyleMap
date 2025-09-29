// src/components/LayoutContent.tsx

"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isEscapeIntroPage = pathname.startsWith("/escape/intro");
    const [isQrOpen, setIsQrOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white min-[600px]:bg-[url('https://stylemap-images.s3.ap-southeast-2.amazonaws.com/homepage.png')] min-[600px]:bg-cover min-[600px]:bg-center">
            <div className="h-screen min-[600px]:max-w-[1180px] min-[600px]:mx-auto min-[600px]:flex min-[600px]:items-stretch min-[600px]:gap-6">
                {/* 데스크톱용 좌측 다운로드 히어로 패널 */}
                <section className="hidden min-[600px]:block relative w-[600px] h-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/40 to-transparent" />
                    <div className="relative h-full flex items-center">
                        <div className="px-10 max-w-[520px] text-white space-y-6">
                            {/* 1. 로고 및 앱 이름 */}
                            <div className="inline-flex items-center gap-3 bg-white/15 border border-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
                                <div className="w-15 h-15 flex items-center justify-center font-extrabold">
                                    <div className=" rounded-1xl">
                                        <img
                                            src="https://stylemap-images.s3.ap-southeast-2.amazonaws.com/logoicon-navy.png"
                                            alt="Logo"
                                            className="w-full h-full"
                                        />
                                    </div>
                                </div>
                                <span className="font-semibold tracking-wide">StyleMap</span>
                            </div>

                            {/* 2. 메인 슬로건 (Headline) */}
                            <h2 className="text-4xl font-extrabold leading-tight drop-shadow">
                                우리의 데이트가 한 편의 이야기가 되다
                            </h2>

                            {/* 3. 부가 설명 (Tagline) */}
                            <div className="text-xl font-bold text-white/95">
                                특별한 데이트 코스 추천부터 함께 채워나가는 스토리까지.
                            </div>

                            {/* 4. 상세 설명 */}
                            <p className="text-white/85 leading-relaxed text-sm">
                                더 이상 똑같은 데이트는 그만. 전문가가 추천하는 테마별 코스로 색다른 하루를 보내거나,
                                함께하는 모든 순간을 기록하며 세상에 단 하나뿐인 둘만의 이야기를 완성해보세요.
                            </p>

                            {/* 5. 앱 다운로드 버튼 (Call to Action) */}
                            <div className="flex items-center gap-4 pt-2">
                                {/* App Store 링크 */}
                                <a
                                    href="https://apps.apple.com/kr/app"
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="App Store"
                                >
                                    <span className="inline-flex items-center justify-center text-black shadow-md rounded-md">
                                        <img
                                            src="/images/Download_on_the_App_Store_Badge_KR_RGB_blk_100317.svg"
                                            alt="Download on the App Store"
                                            className="h-9 min-[600px]:h-11 xl:h-[52px] w-auto object-contain"
                                        />
                                    </span>
                                </a>
                                {/* Google Play 링크 */}
                                <a
                                    href="https://play.google.com/store/apps"
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="Google Play"
                                >
                                    <span className="inline-flex items-center justify-center  text-black shadow-md rounded-md">
                                        <img
                                            src="/images/GetItOnGooglePlay_Badge_Web_color_Korean.png"
                                            alt="Get it on Google Play"
                                            className="h-11 min-[600px]:h-[52px] xl:h-[60px] w-auto object-contain"
                                        />
                                    </span>
                                </a>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsQrOpen(true);
                                    }}
                                >
                                    <div className="ml-2 px-3 py-4  rounded-lg bg-white/15 border border-white/25 text-xs">
                                        QR 코드
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
                {isQrOpen && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsQrOpen(false)}
                    >
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <div
                                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900">앱 설치 QR 코드</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col items-center gap-2">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                                                    "https://apps.apple.com/kr/app"
                                                )}`}
                                                alt="App Store QR"
                                                className="w-full max-w-[220px] h-auto"
                                            />
                                            <span className="text-xs text-gray-600">App Store</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                                                    "https://play.google.com/store/apps"
                                                )}`}
                                                alt="Google Play QR"
                                                className="w-full max-w-[220px] h-auto"
                                            />
                                            <span className="text-xs text-gray-600">Google Play</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className=" mt-2 w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black/90 hover:cursor-pointer"
                                        onClick={() => setIsQrOpen(false)}
                                    >
                                        닫기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="relative h-full bg-white min-[600px]:w-[500px] min-[600px]:shadow-lg flex flex-col">
                    {/* 헤더 영역 */}
                    <div className={`${isEscapeIntroPage ? "hidden" : "block"} flex-shrink-0`}>
                        <Header />
                    </div>
                    <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar scrollbar-hide">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
