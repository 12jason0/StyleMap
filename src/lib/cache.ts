// src/lib/cache.ts

// 간단한 메모리 기반 TTL 캐시
// 주의: 서버리스 환경에서는 인스턴스 수명/스케일링에 따라 캐시 일관성이 보장되지 않습니다.
// 본 프로젝트는 runtime: "nodejs"를 사용 중이며, 짧은 TTL로 읽기 부하를 완화하는 목적입니다.

type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};

export class SimpleTTLCache {
    private store = new Map<string, CacheEntry<unknown>>();
    private readonly defaultTtlMs: number;
    private readonly maxEntries: number;

    constructor(options?: { defaultTtlMs?: number; maxEntries?: number }) {
        this.defaultTtlMs = Math.max(1, options?.defaultTtlMs ?? 5 * 60 * 1000); // 기본 5분
        this.maxEntries = Math.max(10, options?.maxEntries ?? 500);
    }

    get<T>(key: string): T | undefined {
        const entry = this.store.get(key) as CacheEntry<T> | undefined; 
        if (!entry) return undefined;
        if (entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }

    set<T>(key: string, value: T, ttlMs?: number): void {
        const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
        this.store.set(key, { value, expiresAt });
        this.evictIfNeeded();
    }

    has(key: string): boolean {
        const entry = this.store.get(key);
        if (!entry) return false;
        const alive = entry.expiresAt > Date.now();
        if (!alive) this.store.delete(key);
        return alive;
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }

    private evictIfNeeded() {
        if (this.store.size <= this.maxEntries) return;
        const over = this.store.size - this.maxEntries;
        const keys = this.store.keys();
        for (let i = 0; i < over; i++) {
            const k = keys.next().value as string | undefined;
            if (k) this.store.delete(k);
        }
    }
}

// 싱글톤 캐시 인스턴스 (TTL은 환경변수로 조정 가능)
const ttlMs = Number(process.env.COURSES_CACHE_TTL_MS || 0);
export const defaultCache = new SimpleTTLCache({
    defaultTtlMs: Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 5 * 60 * 1000,
    maxEntries: 1000,
});
