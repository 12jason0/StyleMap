import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

// Prisma 클라이언트 싱글톤 (HMR 대응)
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

// ✅ DATABASE_URL(직접 Postgres)을 우선 사용하고, 없으면 PRISMA_DATABASE_URL을 사용
const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL || // 일부 호스팅에서 이 키를 사용
    process.env.PRISMA_DATABASE_URL;

export const prisma: PrismaClient =
    global.__prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
        datasources: {
            db: {
                url: databaseUrl,
            },
        },
    });

if (!global.__prisma) {
    global.__prisma = prisma;
}

// 연결 확인
prisma
    .$connect()
    .then(() => logger.info("Prisma connected successfully"))
    .catch((error) => {
        logger.error("Prisma connection failed", { error });
        if (process.env.NODE_ENV === "production") process.exit(1);
    });

export default prisma;
