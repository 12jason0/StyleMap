import Link from "next/link";

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 ">
                    {/* 회사 정보 */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="mb-4">
                            <span className="text-2xl font-bold text-blue-400">StyleMap</span>
                        </div>
                        <p className="text-gray-300 mb-4 max-w-md">
                            밀키트처럼 꺼내 먹는 여행 코스, StyleMap입니다. AI가 추천하는 완벽한 여행 경험을 제공합니다.
                        </p>
                        <div className="flex space-x-4 mb-4">
                            <a href="#" className="text-white hover:text-gray-300 transition-colors">
                                <img src="/images/kakaotalk.png" alt="Kakao" className="h-8 w-8" />
                            </a>
                            <a
                                href="https://www.instagram.com/stylemap17/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white hover:text-gray-300 transition-colors"
                                aria-label="StyleMap 인스타그램 방문하기"
                            >
                                <img src="/images/instagram.svg" alt="Instagram" className="h-8 w-8" />
                            </a>
                        </div>
                        <div className="text-sm text-gray-400">
                            <p>고객센터: 12jason@naver.com</p>
                        </div>
                    </div>

                    {/* 서비스 */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">서비스</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                                    홈
                                </Link>
                            </li>
                            <li>
                                <Link href="/courses" className="text-gray-300 hover:text-white transition-colors">
                                    코스 탐색
                                </Link>
                            </li>
                            <li>
                                <Link href="/map" className="text-gray-300 hover:text-white transition-colors">
                                    지도 보기
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
                                    서비스 소개
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* 도움말 */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">도움말</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/help" className="text-gray-300 hover:text-white transition-colors">
                                    자주 묻는 질문
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                                    문의하기
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 하단 구분선 */}
                <div className="border-t border-gray-800 mt-8 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="text-gray-400 text-sm">
                            <p>© 2025 StyleMap. 모든 권리 보유.</p>
                            <p className="mt-1">사업자등록번호: | 대표: 오승용</p>
                        </div>
                        <div className="flex space-x-6 mt-4 md:mt-0">
                            <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                                개인정보처리방침
                            </Link>
                            <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                                이용약관
                            </Link>
                            <Link href="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors">
                                쿠키 정책
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
