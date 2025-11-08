# 소셜 로그인 설정 가이드

이 문서는 StyleMap 프로젝트에서 Google, Kakao 소셜 로그인을 설정하는 방법을 안내합니다.

## 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수들을 설정하세요:

```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/stylemap"

# JWT Secret
JWT_SECRET=""

# Kakao Map API
NEXT_PUBLIC_KAKAO_MAP_API_KEY="454509cd057a6d814ccd7258302a359c"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"

# Kakao OAuth
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"
NEXT_PUBLIC_KAKAO_CLIENT_ID="your-kakao-client-id"

<!-- Instagram 관련 항목 제거됨 -->

# Kakao OAuth
KAKAO_CLIENT_ID=""
KAKAO_CLIENT_SECRET=""
NEXT_PUBLIC_KAKAO_CLIENT_ID=""

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 2. Google OAuth 설정

### 2.1 Google Cloud Console에서 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" > "사용자 인증 정보"로 이동

### 2.2 OAuth 2.0 클라이언트 ID 생성

1. "사용자 인증 정보 만들기" > "OAuth 2.0 클라이언트 ID" 클릭
2. 애플리케이션 유형: "웹 애플리케이션" 선택
3. 승인된 리디렉션 URI 추가:
    - `http://localhost:3000/api/auth/google/callback`
    - `http://localhost:3000/auth/google/callback`

### 2.3 필요한 API 활성화

1. "API 및 서비스" > "라이브러리"에서 다음 API 활성화:
    - Google+ API
    - Google People API

### 2.4 클라이언트 ID와 시크릿 복사

생성된 클라이언트 ID와 시크릿을 `.env.local` 파일에 설정

## 3. Kakao OAuth 설정

### 3.1 Kakao Developers에서 앱 생성

1. [Kakao Developers](https://developers.kakao.com/)에 접속
2. 새 앱 생성 또는 기존 앱 선택

### 3.2 플랫폼 설정

1. "플랫폼" > "웹" 플랫폼 추가
2. 사이트 도메인: `http://localhost:3000`
3. 리디렉션 URI 추가:
    - `http://localhost:3000/api/auth/kakao/callback`
    - `http://localhost:3000/auth/kakao/callback`

### 3.3 동의항목 설정

1. "동의항목"에서 다음 항목 활성화:
    - 닉네임 (profile_nickname)
    - 프로필 사진 (profile_image)
    - 이메일 (account_email)

### 3.4 앱 키 복사

REST API 키: `<KAKAO_REST_API_KEY>`
JavaScript 키를 `.env.local` 파일의 `KAKAO_CLIENT_SECRET`에 설정

<!-- Instagram 설정 가이드 제거됨 -->

앱 ID: `1762397561331881` (이미 설정됨)
앱 시크릿을 `.env.local` 파일에 설정

## 5. 데이터베이스 스키마 확인

users 테이블에 소셜 로그인 관련 컬럼이 있는지 확인:

```sql
ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) NULL,
ADD COLUMN kakao_id VARCHAR(255) NULL,
ADD COLUMN profile_image VARCHAR(500) NULL;
```

## 6. 테스트

### 6.1 개발 서버 실행

```bash
npm run dev
```

### 6.2 로그인 페이지 접속

1. `http://localhost:3000/login` 접속
2. 각 소셜 로그인 버튼 클릭
3. OAuth 플로우가 정상적으로 작동하는지 확인

## 7. 문제 해결

### 7.1 일반적인 오류

-   **"redirect_uri_mismatch"**: 리디렉션 URI가 정확히 설정되었는지 확인
-   **"invalid_client"**: 클라이언트 ID와 시크릿이 올바른지 확인
-   **"access_denied"**: 사용자가 권한을 거부했는지 확인

### 7.2 디버깅

1. 브라우저 개발자 도구에서 네트워크 탭 확인
2. 서버 로그에서 오류 메시지 확인
3. 환경 변수가 올바르게 로드되었는지 확인

## 8. 프로덕션 배포 시 주의사항

1. 프로덕션 도메인을 리디렉션 URI에 추가
2. HTTPS 사용 필수
3. 환경 변수를 서버 환경에 설정
4. 보안을 위해 JWT_SECRET 변경

## 9. 추가 리소스

-   [Google OAuth 2.0 문서](https://developers.google.com/identity/protocols/oauth2)
-   [Kakao Login 문서](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
