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
                navigator.sendBeacon("/api/users/interactions", blob);
            } else {
                fetch("/api/users/interactions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ courseId, action: "time_spent", milliseconds }),
                    keepalive: true,
                }).catch(() => {});
            }
        } catch {
            // ignore
        }
    }
}
