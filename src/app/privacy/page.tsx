export default function PrivacyPolicyPage() {
    const CONTACT_EMAIL = "12jason@naver.com";
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <main className="flex-grow container mx-auto px-4 py-8 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
                    <p className="text-gray-600 mb-6">
                        개인정보의 수집·이용 목적과 보관 기간을 항목별로 쉽게 확인할 수 있도록 구성했습니다.
                    </p>

                    <div className="prose prose-lg max-w-none leading-relaxed">
                        {/* 빠른 이동 */}
                        <div className="mb-6 flex flex-wrap gap-2">
                            <a
                                href="#purpose"
                                className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-sm hover:bg-white border"
                            >
                                처리 목적
                            </a>
                            <a
                                href="#retention"
                                className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-sm hover:bg-white border"
                            >
                                보유 기간
                            </a>
                            <a
                                href="#items"
                                className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-sm hover:bg-white border"
                            >
                                처리 항목
                            </a>
                            <a
                                href="#behavior"
                                className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-sm hover:bg-white border"
                            >
                                행태정보
                            </a>
                            <a
                                href="#rights"
                                className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-sm hover:bg-white border"
                            >
                                권리
                            </a>
                            <a
                                href="#security"
                                className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-sm hover:bg-white border"
                            >
                                안전조치
                            </a>
                        </div>
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

                        <h2 id="purpose" className="text-2xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24">
                            제1조 개인정보의 처리목적
                        </h2>
                        <p className="text-gray-700 mb-4">
                            StyleMap은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적
                            이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라
                            별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                        </p>
                        <ul className="list-disc pl-6 mb-6 text-gray-700">
                            <li>회원 가입 및 관리: 회원 식별, 본인 확인, 중복가입 방지</li>
                            <li>서비스 제공: 맞춤형 여행 코스 추천, 지도 서비스 제공</li>
                            {/* [수정된 부분] 서비스 개선 목적을 더 구체화합니다. */}
                            <li>
                                서비스 개선 및 신규 서비스 개발: 서비스 이용 기록 및 접속 빈도 분석, 서비스 이용에 대한
                                통계, 맞춤형 서비스 제공 및 기능 개선
                            </li>
                            <li>고객 지원: 문의사항 처리 및 공지사항 전달</li>
                        </ul>

                        <h2 id="retention" className="text-2xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24">
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
                            {/* [수정된 부분] GA 데이터 보유 기간을 명시합니다. */}
                            <li>
                                <strong>서비스 이용기록 (로그 데이터, 행태정보):</strong> 개인을 식별할 수 없도록
                                비식별화 처리 후 통계 및 분석 목적으로 최대 26개월 보관 후 파기
                            </li>
                        </ul>

                        <h2 id="items" className="text-2xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24">
                            제3조 처리하는 개인정보 항목
                        </h2>
                        <p className="text-gray-700 mb-4">StyleMap은 다음의 개인정보 항목을 처리하고 있습니다.</p>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">1. 회원가입 시</h3>
                        <ul className="list-disc pl-6 mb-4 text-gray-700">
                            <li>
                                <strong>필수 항목:</strong> 이메일 주소, 닉네임 (소셜 로그인 시 제공받는 정보)
                            </li>
                            <li>
                                <strong>선택 항목:</strong> 프로필 이미지, 여행 선호도 정보 (MBTI, 선호 지역 등)
                            </li>
                        </ul>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">2. 미션 참여 등 특정 기능 이용 시</h3>
                        <ul className="list-disc pl-6 mb-4 text-gray-700">
                            <li>
                                <strong>'Escape 미션' 사진 업로드:</strong> 미션 수행을 위해 이용자가 직접 촬영하거나
                                선택하여 업로드하는 사진 파일. 해당 사진은 서비스 내 '추억 액자'와 같은 기능으로
                                본인에게 다시 보여질 수 있습니다.
                            </li>
                            <li>
                                <strong>사진 데이터의 이용 범위 제한:</strong> 이용자가 업로드한 사진 데이터는 오직
                                '추억 액자' 기능 제공을 위한 목적으로만 사용되며, 추천 알고리즘 학습, 광고 타게팅, 외부
                                제공 등 그 밖의 용도로는 사용하지 않습니다.
                            </li>
                        </ul>

                        {/* [수정된 부분] 자동 수집 항목을 더 구체화합니다. */}
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            3. 서비스 이용과정에서 자동 생성 및 수집되는 정보
                        </h3>
                        <ul className="list-disc pl-6 mb-6 text-gray-700">
                            <li>
                                IP 주소, 쿠키, 서비스 이용 기록(방문 기록, 페이지 조회, 클릭 기록 등), 기기
                                정보(브라우저 종류, OS 정보)
                            </li>
                        </ul>

                        {/* [추가된 부분] 구글 애널리틱스 관련 내용을 명시적으로 추가합니다. */}
                        <h2 id="behavior" className="text-2xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24">
                            제4조 행태정보의 수집·이용 및 거부 등에 관한 사항
                        </h2>
                        <p className="text-gray-700 mb-4">
                            서비스는 이용자에게 더 나은 서비스를 제공하기 위해 다음과 같이 행태정보를 수집 및 이용하고
                            있습니다.
                        </p>
                        <ul className="list-disc pl-6 mb-4 text-gray-700">
                            <li>
                                <strong>수집하는 행태정보의 항목:</strong> 웹사이트 방문 기록, 페이지 조회 이력, 클릭
                                이력, 검색어 등
                            </li>
                            <li>
                                <strong>행태정보 수집 목적:</strong> 서비스 이용 현황 및 통계 분석을 통한 서비스 개선 및
                                최적화
                            </li>
                            <li>
                                <strong>행태정보를 수집하는 외부 도구:</strong> Google Analytics
                            </li>
                            <li>
                                <strong>Google Analytics를 통해 수집된 정보의 처리 방식:</strong> Google Analytics는
                                쿠키를 통해 개인을 식별할 수 없는 형태로 정보를 수집하며, 이 정보는 Google의
                                개인정보처리방침에 따라 관리됩니다. 자세한 내용은 'Google이 Google 서비스를 사용하는
                                사이트 또는 앱의 정보를 이용하는 방법' (
                                <a
                                    href="https://www.google.com/policies/privacy/partners/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                >
                                    www.google.com/policies/privacy/partners/
                                </a>
                                ) 페이지에서 확인하실 수 있습니다.
                            </li>
                        </ul>
                        <p className="text-gray-700 mb-6">
                            이용자는 웹 브라우저의 설정을 변경하여 쿠키 저장을 거부할 수 있으나, 이 경우 서비스 이용에
                            불편이 발생할 수 있습니다.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제5조 개인정보의 제3자 제공</h2>
                        <p className="text-gray-700 mb-6">
                            StyleMap은 정보주체의 개인정보를 제1조(개인정보의 처리목적)에서 명시한 범위 내에서만
                            처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조에 해당하는 경우에만
                            개인정보를 제3자에게 제공합니다. 현재 서비스는 법률에 따른 의무 이행 외에 개인정보를
                            제3자에게 제공하고 있지 않습니다.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제6조 개인정보처리 위탁</h2>
                        <p className="text-gray-700 mb-4">
                            StyleMap은 현재 개인정보 처리업무를 위탁하고 있지 않습니다.
                        </p>

                        {/* 이하 내용은 기존과 동일하므로 생략합니다. 가독성을 위해 기존 코드를 그대로 붙여넣으시면 됩니다. */}
                        {/* ... 제7조부터 부칙까지 ... */}

                        <h2 id="rights" className="text-2xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24">
                            제7조 정보주체의 권리·의무 및 행사방법
                        </h2>
                        <p className="text-gray-700 mb-4">
                            정보주체는 StyleMap에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수
                            있습니다.
                        </p>
                        <ul className="list-disc pl-6 mb-4 text-gray-700">
                            <li>개인정보 열람 요구</li>
                            <li>오류 등이 있을 경우 정정 요구</li>
                            <li>삭제 요구</li>
                            <li>처리정지 요구</li>
                        </ul>
                        <p className="text-gray-700 mb-6">
                            위의 권리 행사는 개인정보보호법 시행령 제41조제1항에 따라 서면, 전자우편 등을 통하여 하실 수
                            있으며 StyleMap은 이에 대해 지체없이 조치하겠습니다.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제8조 개인정보의 파기</h2>
                        <p className="text-gray-700 mb-6">
                            StyleMap은 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
                            지체없이 해당 개인정보를 파기합니다.
                        </p>

                        <h2 id="security" className="text-2xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24">
                            제9조 개인정보의 안전성 확보조치
                        </h2>
                        <p className="text-gray-700 mb-4">
                            StyleMap은 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적/관리적 및
                            물리적 조치를 하고 있습니다.
                        </p>
                        <ul className="list-disc pl-6 mb-6 text-gray-700">
                            <li>개인정보 취급 직원의 최소화 및 교육</li>
                            <li>개인정보에 대한 접근 제한</li>
                            <li>접속기록의 보관 및 위변조 방지</li>
                            <li>개인정보의 암호화</li>
                            <li>해킹 등에 대비한 기술적 대책</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제10조 개인정보 보호책임자</h2>
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
                                <strong>연락처:</strong> {CONTACT_EMAIL}
                            </p>
                            <p className="text-gray-600 text-sm mt-2">
                                ※ 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및
                                담당부서로 문의하실 수 있습니다.
                            </p>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">제11조 개인정보 처리방침 변경</h2>
                        <p className="text-gray-700 mb-2">이 개인정보처리방침은 2025년 9월 12일부터 적용됩니다.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
