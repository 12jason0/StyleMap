# StyleMap

StyleMap은 여러분의 스타일을 지도에 표시하고 공유할 수 있는 플랫폼입니다.

## 🚀 시작하기

### 필수 요구사항

-   Node.js 18+
-   MySQL 8.0+
-   npm 또는 yarn

### 설치

1. 저장소 클론

```bash
git clone <repository-url>
cd StyleMap
```

2. 의존성 설치

```bash
npm install
```

3. 환경변수 설정
   `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
DATABASE_URL="mysql://username:password@localhost:3306/stylemap"
```

**MySQL 연결 정보:**

-   `root`: MySQL 사용자명
-   `127.0.0.1:3306`: MySQL 서버 주소와 포트
-   `stylemap`: 데이터베이스 이름

### 데이터베이스 설정

1. MySQL에서 데이터베이스 생성

```sql
CREATE DATABASE stylemap;
```

2. Prisma 마이그레이션 실행

```bash
npx prisma migrate dev --name init
```

3. Prisma 클라이언트 생성

```bash
npx prisma generate
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📁 프로젝트 구조

```
StyleMap/
├── src/
│   ├── app/
│   │   ├── api/           # API 라우트
│   │   │   ├── courses/   # 코스 관련 API
│   │   │   ├── users/     # 사용자 관련 API
│   │   │   ├── bookings/  # 예약 관련 API
│   │   │   └── reviews/   # 리뷰 관련 API
│   │   ├── components/    # React 컴포넌트
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── courses/       # 코스 페이지
│   │   └── page.tsx       # 메인 페이지
│   ├── lib/
│   │   └── db.ts         # Prisma 클라이언트 설정
│   └── types/
│       └── kakao.d.ts    # Kakao Map 타입 정의
├── prisma/
│   └── schema.prisma     # 데이터베이스 스키마
└── public/
    └── images/           # 이미지 파일들
```

## 🗄️ 데이터베이스 스키마

### User (사용자)

-   `id`: 고유 식별자
-   `email`: 이메일 (고유)
-   `name`: 이름
-   `password`: 비밀번호
-   `createdAt`: 생성일
-   `updatedAt`: 수정일

### Course (코스)

-   `id`: 고유 식별자
-   `title`: 제목
-   `description`: 설명
-   `duration`: 소요 시간
-   `location`: 위치
-   `price`: 가격
-   `imageUrl`: 이미지 URL
-   `concept`: 컨셉 (카페투어, 맛집투어 등)
-   `rating`: 평점
-   `reviewCount`: 리뷰 수
-   `participants`: 참가자 수
-   `creatorId`: 생성자 ID (User 참조)

### Review (리뷰)

-   `id`: 고유 식별자
-   `rating`: 평점 (1-5)
-   `comment`: 댓글
-   `userId`: 작성자 ID (User 참조)
-   `courseId`: 코스 ID (Course 참조)

### Booking (예약)

-   `id`: 고유 식별자
-   `status`: 상태 (pending, confirmed, cancelled, completed)
-   `userId`: 사용자 ID (User 참조)
-   `courseId`: 코스 ID (Course 참조)

## 🔧 API 엔드포인트

### 코스 관련

-   `GET /api/courses` - 모든 코스 조회
-   `GET /api/courses?concept=카페투어` - 특정 컨셉 코스 조회
-   `POST /api/courses` - 새 코스 생성

### 사용자 관련

-   `GET /api/users` - 모든 사용자 조회
-   `GET /api/users?email=user@example.com` - 특정 사용자 조회
-   `POST /api/users` - 새 사용자 생성

### 예약 관련

-   `GET /api/bookings` - 모든 예약 조회
-   `GET /api/bookings?userId=123` - 특정 사용자 예약 조회
-   `POST /api/bookings` - 새 예약 생성

### 리뷰 관련

-   `GET /api/reviews` - 모든 리뷰 조회
-   `GET /api/reviews?courseId=123` - 특정 코스 리뷰 조회
-   `POST /api/reviews` - 새 리뷰 생성

## 🎨 주요 기능

-   **컨셉별 코스 탐색**: 카페투어, 맛집투어, 쇼핑 등 다양한 컨셉
-   **실시간 위치 기반 서비스**: Kakao Map API 연동
-   **코스 예약 시스템**: 실시간 예약 및 참가자 수 관리
-   **리뷰 및 평점 시스템**: 사용자 리뷰와 평점 관리
-   **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원

## 🛠️ 기술 스택

-   **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
-   **Backend**: Next.js API Routes
-   **Database**: MySQL 8.0
-   **ORM**: Prisma
-   **Maps**: Kakao Map JavaScript API
-   **Styling**: Tailwind CSS

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.
