# 데이터베이스 설정 가이드

## 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=stylemap

# Next.js Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Kakao Map API (선택사항)
NEXT_PUBLIC_KAKAO_MAP_API_KEY=your_kakao_map_api_key_here
```

## 2. MySQL 데이터베이스 설정

### 2.1 MySQL 서버 설치 및 실행

-   MySQL 8.0 이상 설치
-   MySQL 서버 실행 확인

### 2.2 데이터베이스 및 테이블 생성

```bash
# MySQL에 접속
mysql -u root -p

# 스키마 실행
source database/schema.sql

# course_notices 테이블 확인
SELECT * FROM course_notices WHERE course_id = 12;
```

또는 MySQL Workbench에서 `database/schema.sql`과 `database/seed.sql` 파일을 실행하세요.

## 3. 데이터베이스 연결 테스트

애플리케이션을 실행한 후 다음 URL로 데이터베이스 연결을 테스트할 수 있습니다:

```
http://localhost:3000/api/test-db
```

성공 응답:

```json
{
    "success": true,
    "message": "데이터베이스 연결 성공",
    "test": [{ "test": 1 }],
    "userCount": [{ "count": 3 }]
}
```

## 4. 코스 API 테스트

코스 데이터를 가져오는 API를 테스트하세요:

```
http://localhost:3000/api/courses
```

## 5. 문제 해결

### 5.1 연결 오류 (ECONNREFUSED)

-   MySQL 서버가 실행 중인지 확인
-   포트 번호가 올바른지 확인 (기본: 3306)

### 5.2 테이블 없음 오류 (ER_NO_SUCH_TABLE)

-   `database/schema.sql` 파일을 실행했는지 확인
-   데이터베이스 이름이 올바른지 확인

### 5.3 인증 오류

-   사용자명과 비밀번호가 올바른지 확인
-   데이터베이스 접근 권한이 있는지 확인

## 6. 개발 환경 설정

개발 중에는 다음 명령어로 애플리케이션을 실행하세요:

```bash
npm run dev
```

이제 데이터베이스 연결이 설정되어 API가 정상적으로 작동할 것입니다.

## 4. 데이터 확인

설정이 완료되면 다음 URL들로 데이터가 정상적으로 로딩되는지 확인하세요:

-   **메인 페이지**: `http://localhost:3000` - 코스 목록 표시
-   **코스 상세 페이지**: `http://localhost:3000/courses/1` - 코스 상세 정보 표시
-   **팝업 페이지**: `http://localhost:3000/popup` - 팝업 스토어 목록 표시

모든 데이터는 MySQL 데이터베이스에서 실시간으로 가져오며, 하드 코딩된 더미 데이터는 사용하지 않습니다.
