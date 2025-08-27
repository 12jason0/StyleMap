-- StyleMap 데이터베이스 스키마

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS stylemap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE stylemap;

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    profile_image VARCHAR(500),
    google_id VARCHAR(255) UNIQUE,
    kakao_id VARCHAR(255) UNIQUE,
    instagram_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
