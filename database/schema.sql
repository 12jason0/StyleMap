-- StyleMap 데이터베이스 스키마

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS stylemap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE stylemap;

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    nickname VARCHAR(100) NOT NULL,
    profileImageUrl VARCHAR(500),
    socialId VARCHAR(255),
    provider VARCHAR(50) NOT NULL DEFAULT 'local',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider_socialId (provider, socialId),
    INDEX idx_email (email)
);

-- 사용자 선호도 테이블
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    travel_style JSON,
    budget_range VARCHAR(50),
    time_preference JSON,
    food_preference JSON,
    activity_level VARCHAR(50),
    group_size VARCHAR(50),
    interests JSON,
    location_preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



-- 코스 테이블
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration VARCHAR(100),
    region VARCHAR(100),
    price VARCHAR(100),
    imageUrl VARCHAR(500),
    concept VARCHAR(100),
    rating DECIMAL(3,2) DEFAULT 0.00,
    current_participants INT DEFAULT 0,
    max_participants INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 장소 테이블
CREATE TABLE IF NOT EXISTS places (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    description TEXT,
    category VARCHAR(100),
    avg_cost_range VARCHAR(100),
    opening_hours VARCHAR(200),
    phone VARCHAR(50),
    website VARCHAR(500),
    parking_available BOOLEAN DEFAULT FALSE,
    reservation_required BOOLEAN DEFAULT FALSE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 코스-장소 연결 테이블
CREATE TABLE IF NOT EXISTS course_places (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    place_id INT NOT NULL,
    order_index INT NOT NULL,
    estimated_duration INT DEFAULT 60,
    recommended_time VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id),
    INDEX idx_order (course_id, order_index)
);

-- 하이라이트 테이블
CREATE TABLE IF NOT EXISTS highlights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 혜택 테이블
CREATE TABLE IF NOT EXISTS benefits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    benefit_text TEXT NOT NULL,
    category VARCHAR(100),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 공지사항 테이블
CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    notice_text TEXT NOT NULL,
    type VARCHAR(100) DEFAULT 'info',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 코스 공지사항 테이블 (course_notices)
CREATE TABLE IF NOT EXISTS course_notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    notice_text TEXT NOT NULL,
    type VARCHAR(100) DEFAULT 'info',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 연락처 테이블
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    type VARCHAR(100),
    icon VARCHAR(10),
    label VARCHAR(255),
    value VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 예약 테이블
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(100) NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    booking_date DATE NOT NULL,
    status ENUM('예약완료', '취소됨', '완료') DEFAULT '예약완료',
    price VARCHAR(50) NOT NULL,
    participants INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 사용자 찜 목록 테이블
CREATE TABLE IF NOT EXISTS user_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_course (user_id, course_id)
);

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_course_id ON user_favorites(course_id);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_course_places_course_id ON course_places(course_id);
CREATE INDEX idx_highlights_course_id ON highlights(course_id);
CREATE INDEX idx_benefits_course_id ON benefits(course_id);
CREATE INDEX idx_notices_course_id ON notices(course_id);
CREATE INDEX idx_course_notices_course_id ON course_notices(course_id);
CREATE INDEX idx_contacts_course_id ON contacts(course_id);
