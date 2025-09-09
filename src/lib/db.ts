import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

// Prisma 클라이언트 싱글톤 (HMR 대응)
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
    global.__prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
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
