type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: unknown): void {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
        const payload = JSON.stringify({ level, message, meta, timestamp: new Date().toISOString() });
        // eslint-disable-next-line no-console
        console.log(payload);
        return;
    }
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](`[${level.toUpperCase()}] ${message}`, meta ?? "");
}

export const logger = {
    debug: (message: string, meta?: unknown) => log("debug", message, meta),
    info: (message: string, meta?: unknown) => log("info", message, meta),
    warn: (message: string, meta?: unknown) => log("warn", message, meta),
    error: (message: string, meta?: unknown) => log("error", message, meta),
};
