import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

// Prisma 클라이언트 싱글톤 (HMR 대응)
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

// ✅ PRISMA_DATABASE_URL (Accelerate)를 우선 사용
const databaseUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;

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

// 연결 확인 (빌드 시에는 건너뛰기)
// Next.js 빌드 중에는 데이터베이스 연결을 시도하지 않음
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build" || 
                    process.env.NEXT_PHASE === "phase-development-build" ||
                    typeof window === "undefined" && process.argv.includes("build");

if (!isBuildTime) {
    prisma
        .$connect()
        .then(() => logger.info("Prisma connected successfully"))
        .catch((error) => {
            logger.error("Prisma connection failed", { error });
            // 프로덕션 런타임에서만 연결 실패 시 종료
            if (process.env.NODE_ENV === "production" && !isBuildTime) {
                process.exit(1);
            }
        });
}

export default prisma;
