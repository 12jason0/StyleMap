// src/app/privacy/page.tsx 수정 내용

export default function PrivacyPolicyPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <main className="flex-grow container mx-auto px-4 py-8 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">개인정보처리방침</h1>

                    <div className="prose prose-lg max-w-none">
                        {/* 베타 서비스 안내 */}
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
                            <p className="text-sm text-blue-800">
                                🚀 현재 베타 서비스 운영 중입니다. 개인정보보호위원회 가이드라인을 참고하여
                                작성하였으며, 정식 서비스 전환 시 전문가 검토를 통해 보완할 예정입니다.
                            </p>
                        </div>

                        <p className="text-gray-700 mb-6">
                            StyleMap(이하 '서비스')은 개인정보보호법 제30조에 따라 정보주체의 개인정보를 보호하고 이와
                            관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을
                            수립·공개합니다.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제1조 개인정보의 처리목적</h2>
                        <p className="text-gray-700 mb-4">
                            StyleMap은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적
                            이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라
                            별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                        </p>
                        <ul className="list-disc pl-6 mb-6 text-gray-700">
                            <li>회원 가입 및 관리: 회원 식별, 본인 확인, 중복가입 방지</li>
                            <li>서비스 제공: 맞춤형 여행 코스 추천, 지도 서비스 제공</li>
                            <li>서비스 개선: 이용 패턴 분석을 통한 서비스 품질 향상</li>
                            <li>고객 지원: 문의사항 처리 및 공지사항 전달</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                            제2조 개인정보의 처리 및 보유기간
                        </h2>
                        <p className="text-gray-700 mb-4">
                            StyleMap은 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에
                            동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                        </p>
                        <ul className="list-disc pl-6 mb-6 text-gray-700">
                            <li>
                                <strong>회원정보:</strong> 회원탈퇴 시까지 (단, 관계법령 위반에 따른 수사·조사 등이
                                진행중인 경우 해당 조사 종료 시까지)
                            </li>
                            <li>
                                <strong>서비스 이용기록:</strong> 3개월 (서비스 개선 목적)
                            </li>
                            <li>
                                <strong>접속 로그:</strong> 3개월 (정보통신망법에 따라)
                            </li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제3조 처리하는 개인정보 항목</h2>
                        <p className="text-gray-700 mb-4">StyleMap은 다음의 개인정보 항목을 처리하고 있습니다.</p>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">1. 필수 항목</h3>
                        <ul className="list-disc pl-6 mb-4 text-gray-700">
                            <li>이메일 주소 (카카오 로그인 시)</li>
                            <li>닉네임</li>
                            <li>서비스 이용 기록</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">2. 선택 항목</h3>
                        <ul className="list-disc pl-6 mb-4 text-gray-700">
                            <li>프로필 이미지</li>
                            <li>여행 선호도 정보 (MBTI, 선호 지역 등)</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">3. 자동 수집 항목</h3>
                        <ul className="list-disc pl-6 mb-6 text-gray-700">
                            <li>접속 IP 정보, 쿠키, 방문 일시</li>
                            <li>서비스 이용 기록, 불량 이용 기록</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제4조 개인정보의 제3자 제공</h2>
                        <p className="text-gray-700 mb-6">
                            StyleMap은 정보주체의 개인정보를 제1조(개인정보의 처리목적)에서 명시한 범위 내에서만
                            처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조에 해당하는 경우에만
                            개인정보를 제3자에게 제공합니다.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제5조 개인정보처리 위탁</h2>
                        <p className="text-gray-700 mb-4">
                            StyleMap은 현재 개인정보 처리업무를 위탁하고 있지 않습니다.
                        </p>
                        <p className="text-gray-700 mb-6">
                            향후 처리업무를 위탁하는 경우 위탁계약 체결 시 개인정보보호법 제26조에 따라 위탁업무
                            수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독,
                            손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게
                            처리하는지를 감독하겠습니다.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                            제6조 정보주체의 권리·의무 및 행사방법
                        </h2>
                        <p className="text-gray-700 mb-4">
                            정보주체는 StyleMap에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수
                            있습니다.
                        </p>
                        <ul className="list-disc pl-6 mb-4 text-gray-700">
                            <li>개인정보 처리현황 통지 요구</li>
                            <li>개인정보 처리정지 요구</li>
                            <li>개인정보의 정정·삭제 요구</li>
                            <li>손해배상 청구</li>
                        </ul>
                        <p className="text-gray-700 mb-6">
                            위의 권리 행사는 개인정보보호법 시행령 제41조제1항에 따라 서면, 전자우편 등을 통하여 하실 수
                            있으며 StyleMap은 이에 대해 지체없이 조치하겠습니다.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제7조 개인정보의 파기</h2>
                        <p className="text-gray-700 mb-6">
                            StyleMap은 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
                            지체없이 해당 개인정보를 파기합니다. 개인정보 파기의 절차, 기한 및 방법은 다음과 같습니다.
                        </p>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">파기절차</h3>
                        <p className="text-gray-700 mb-4">
                            StyleMap은 파기 사유가 발생한 개인정보를 선정하고, 개인정보 보호책임자의 승인을 받아
                            개인정보를 파기합니다.
                        </p>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">파기방법</h3>
                        <ul className="list-disc pl-6 mb-6 text-gray-700">
                            <li>
                                전자적 파일 형태: 기록을 재생할 수 없도록 로우레벨포멧(Low Level Format) 등의 방법을
                                이용하여 파기
                            </li>
                            <li>종이 문서: 분쇄하거나 소각하여 파기</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제8조 개인정보의 안전성 확보조치</h2>
                        <p className="text-gray-700 mb-4">
                            StyleMap은 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적/관리적 및
                            물리적 조치를 하고 있습니다.
                        </p>
                        <ul className="list-disc pl-6 mb-6 text-gray-700">
                            <li>개인정보 취급 직원의 최소화 및 교육</li>
                            <li>개인정보에 대한 접근 제한</li>
                            <li>개인정보를 안전하게 저장·전송할 수 있는 암호화 기법 사용</li>
                            <li>해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손 방지</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제9조 개인정보 보호책임자</h2>
                        <p className="text-gray-700 mb-4">
                            StyleMap은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의
                            불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                        </p>
                        <div className="bg-gray-50 p-6 rounded-lg mb-6">
                            <p className="text-gray-700 mb-2">
                                <strong>개인정보 보호책임자</strong>
                            </p>
                            <p className="text-gray-700 mb-1">
                                <strong>성명: 오승용</strong>
                            </p>
                            <p className="text-gray-700 mb-1">
                                <strong>직책: 대표</strong>
                            </p>
                            <p className="text-gray-700 mb-1">
                                <strong>연락처: 010-2271-9824</strong> 12jason@naver.com
                            </p>
                            <p className="text-gray-600 text-sm mt-2">※ 개인정보 보호 담당부서로 연결됩니다.</p>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">부칙</h2>
                        <p className="text-gray-700 mb-2">이 개인정보처리방침은 2025년 9월 10일부터 적용됩니다.</p>
                        <p className="text-gray-700">이전의 개인정보처리방침은 아래에서 확인하실 수 있습니다.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
