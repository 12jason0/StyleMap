# 코스 상세 페이지 문제 해결 가이드

## 문제 상황

코스 상세 페이지에서 데이터가 제대로 로딩되지 않는 문제

## 해결 방법

### 1. 데이터베이스 설정 확인

#### 1.1 환경 변수 설정

`.env.local` 파일에 다음 내용이 있는지 확인:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=stylemap_db

# Next.js Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

#### 1.2 데이터베이스 스키마 적용

MySQL에서 다음 명령어를 실행:

```sql
-- 데이터베이스 생성 및 사용
CREATE DATABASE IF NOT EXISTS stylemap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stylemap;

-- 스키마 파일 실행
source database/schema.sql;
```

### 2. API 엔드포인트 테스트

#### 2.1 코스 기본 정보 API 테스트

```bash
curl http://localhost:3000/api/courses/1
```

예상 응답:

```json
{
    "id": "1",
    "title": "성수 감성 카페투어",
    "description": "인스타 감성 카페 3곳을 둘러보는 특별한 코스",
    "duration": "3시간",
    "location": "성수동",
    "price": "30000원",
    "imageUrl": "/images/CoffeTrand.png",
    "concept": "핫플투어",
    "rating": 4.8,
    "reviewCount": 0,
    "participants": 15,
    "maxParticipants": 10,
    "isPopular": true,
    "recommendedTime": "오후 2시-6시",
    "season": "사계절",
    "courseType": "일반",
    "transportation": "대중교통",
    "parking": "주차 가능",
    "reservationRequired": false,
    "placeCount": 3,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 2.2 코스 하이라이트 API 테스트

```bash
curl http://localhost:3000/api/courses/1/highlights
```

#### 2.3 코스 혜택 API 테스트

```bash
curl http://localhost:3000/api/courses/1/benefits
```

#### 2.4 코스 공지사항 API 테스트

```bash
curl http://localhost:3000/api/courses/1/notices
```

#### 2.5 코스 장소 API 테스트

```bash
curl http://localhost:3000/api/courses/1/places
```

### 3. 브라우저 개발자 도구 확인

#### 3.1 네트워크 탭 확인

1. F12를 눌러 개발자 도구 열기
2. Network 탭 선택
3. 코스 상세 페이지 새로고침
4. API 호출들이 성공적으로 완료되는지 확인

#### 3.2 콘솔 탭 확인

브라우저 콘솔에서 다음 로그 메시지들을 확인:

```
Fetching course data for ID: 1
API responses: {course: "fulfilled", highlights: "fulfilled", ...}
Course data received: {...}
Final course data: {...}
```

### 4. 일반적인 문제 및 해결책

#### 4.1 "코스를 찾을 수 없습니다" 에러

**원인**: 데이터베이스에 해당 ID의 코스가 없음
**해결책**:

-   데이터베이스에 테스트 데이터가 제대로 삽입되었는지 확인
-   `SELECT * FROM courses WHERE id = 1;` 실행

#### 4.2 "Failed to fetch course" 에러

**원인**: 데이터베이스 연결 실패
**해결책**:

-   MySQL 서버가 실행 중인지 확인
-   환경 변수가 올바르게 설정되었는지 확인
-   데이터베이스 연결 테스트: `http://localhost:3000/api/test-db`

#### 4.3 지도가 로딩되지 않는 문제

**원인**: 카카오맵 API 키가 설정되지 않음
**해결책**:

-   `.env.local`에 `NEXT_PUBLIC_KAKAO_MAP_API_KEY` 추가
-   카카오맵 API 키 발급 및 설정

#### 4.4 이미지가 표시되지 않는 문제

**원인**: 이미지 파일이 없거나 경로가 잘못됨
**해결책**:

-   `public/images/` 폴더에 이미지 파일들이 있는지 확인
-   기본 이미지 경로가 올바른지 확인

### 5. 데이터베이스 데이터 확인

#### 5.1 코스 데이터 확인

```sql
SELECT * FROM courses WHERE id = 1;
```

#### 5.2 장소 데이터 확인

```sql
SELECT * FROM places;
```

#### 5.3 코스-장소 연결 데이터 확인

```sql
SELECT cp.*, p.name as place_name
FROM course_places cp
JOIN places p ON cp.place_id = p.id
WHERE cp.course_id = 1
ORDER BY cp.order_index;
```

#### 5.4 하이라이트 데이터 확인

```sql
SELECT * FROM highlights WHERE course_id = 1;
```

#### 5.5 혜택 데이터 확인

```sql
SELECT * FROM benefits WHERE course_id = 1;
```

#### 5.6 공지사항 데이터 확인

```sql
SELECT * FROM course_notices WHERE course_id = 1;
```

### 6. 캐시 초기화

브라우저 캐시나 세션 스토리지가 문제를 일으킬 수 있습니다:

1. 브라우저 개발자 도구 열기 (F12)
2. Application 탭 선택
3. Session Storage에서 `course_1` 키 삭제
4. 페이지 새로고침

### 7. 추가 디버깅

코스 상세 페이지에서 더 자세한 로그를 확인하려면:

1. 브라우저 개발자 도구 콘솔에서 로그 확인
2. 네트워크 탭에서 API 응답 확인
3. React Developer Tools에서 컴포넌트 상태 확인

이 가이드를 따라도 문제가 해결되지 않으면, 구체적인 에러 메시지를 공유해 주시면 더 정확한 해결책을 제공할 수 있습니다.
