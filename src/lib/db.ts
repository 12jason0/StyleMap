import mysql from "mysql2/promise";

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "@o5334044112",
    database: process.env.DB_NAME || "stylemap",
    connectionLimit: 20, // 연결 수 증가
    queueLimit: 0,
    // 성능 최적화 설정
    acquireTimeout: 30000, // 30초로 단축
    timeout: 30000, // 30초로 단축
    // 추가 최적화 옵션
    multipleStatements: false, // 보안상 false
    dateStrings: true, // 날짜를 문자열로 반환하여 파싱 오버헤드 감소
    supportBigNumbers: true,
    bigNumberStrings: true,
    // 연결 풀 최적화
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

// 연결 테스트
pool.getConnection()
    .then((connection) => {
        console.log("Database connected successfully");
        connection.release();
    })
    .catch((error) => {
        console.error("Database connection failed:", error);
    });

export default pool;
