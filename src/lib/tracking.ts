export class UserTracker {
    private readonly userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    trackTimeSpent(courseId: string, milliseconds: number): void {
        if (typeof window === "undefined") return;
        try {
            const payload = {
                userId: this.userId,
                courseId,
                milliseconds,
                path: window.location.pathname,
                timestamp: Date.now(),
            };

            const json = JSON.stringify(payload);
            if (navigator.sendBeacon) {
                const blob = new Blob([json], { type: "application/json" });
                navigator.sendBeacon("/api/analytics/time-spent", blob);
            } else {
                fetch("/api/analytics/time-spent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: json,
                    keepalive: true,
                }).catch(() => {});
            }
        } catch {
            // ignore
        }
    }
}
