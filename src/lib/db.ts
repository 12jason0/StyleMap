import mysql from "mysql2/promise";

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "@o5334044112",
    database: process.env.DB_NAME || "stylemap",
    connectionLimit: 10,
    queueLimit: 0,
    // 추가 설정
    acquireTimeout: 60000,
    timeout: 60000,
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
