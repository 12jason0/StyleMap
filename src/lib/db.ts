import mysql from "mysql2/promise";

const dbConfig = {
    host: "localhost",
    user: "root",
    password: "@o5334044112", // 실제 MySQL root 비밀번호
    database: "stylemap",
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

// 데이터베이스 설정 로깅 (비밀번호는 제외)
console.log("DB 설정:", {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port,
    password: dbConfig.password ? "***" : "없음",
});

const pool = mysql.createPool(dbConfig);

// 연결 테스트
pool.getConnection((err, connection) => {
    if (err) {
        console.error("데이터베이스 연결 실패:", err);
        console.error("에러 코드:", err.code);
        console.error("에러 메시지:", err.message);
    } else {
        console.log("데이터베이스 연결 성공!");
        connection.release();
    }
});

export default pool;
