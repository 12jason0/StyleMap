import mysql, { Pool } from "mysql2/promise";
import { logger } from "./logger";

// 글로벌 싱글톤 풀 (Next.js HMR로 인한 다중 생성 방지)
declare global {
    // eslint-disable-next-line no-var
    var __mysqlPool: Pool | undefined;
}

const pool: Pool =
    global.__mysqlPool ??
    mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
        // 추가 옵션
        multipleStatements: false,
        dateStrings: true,
        supportBigNumbers: true,
        bigNumberStrings: true,
        // 연결 풀 최적화
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
    });

if (!global.__mysqlPool) {
    global.__mysqlPool = pool;
}

// 연결 테스트
pool.getConnection()
    .then((connection) => {
        logger.info("Database connected successfully");
        connection.release();
    })
    .catch((error) => {
        logger.error("Database connection failed:", { error });
        if (process.env.NODE_ENV === "production") {
            process.exit(1);
        }
    });

export default pool;
