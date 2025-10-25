// src/components/Footer.tsx

"use client";

import React from "react";

export default function Footer() {
    return (
        <footer
            className="fixed bottom-0 left-0 right-0 z-40"
            style={{ backgroundColor: "#ffffff", borderTop: "2px solid rgba(153,192,142,0.5)" }}
        >
            <div className="max-w-7xl mx-auto px-4 py-4">
                <nav className="flex items-center justify-around">
                    <a
                        href="/"
                        aria-label="메인"
                        title="메인"
                        className="p-2 rounded-md hover:bg-green-50"
                        style={{ color: "#99c08e" }}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 10.5L12 4l9 6.5" />
                            <path d="M5 10.5V20h14V10.5" />
                            <path d="M10 20v-5h4v5" />
                        </svg>
                    </a>
                    <a
                        href="/mypage"
                        aria-label="마이페이지"
                        title="마이페이지"
                        className="p-2 rounded-md hover:bg-green-50"
                        style={{ color: "#99c08e" }}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="8" r="3.5" />
                            <path d="M4 20c1.8-4.4 6-5.5 8-5.5s6.2 1.1 8 5.5" />
                        </svg>
                    </a>
                    <a
                        href="/forest"
                        aria-label="나무"
                        title="나무"
                        className="p-2 rounded-md hover:bg-green-50"
                        style={{ color: "#99c08e" }}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 4l-4 5h8l-4-5z" />
                            <path d="M12 8l-5 6h10l-5-6z" />
                            <path d="M12 14v6" />
                            <path d="M9 20h6" />
                        </svg>
                    </a>
                    <a
                        href="/courses"
                        aria-label="코스"
                        title="코스"
                        className="p-2 rounded-md hover:bg-green-50"
                        style={{ color: "#99c08e" }}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M9 4l-6 2v13l6-2 6 2 6-2V4l-6 2-6-2z" />
                            <path d="M9 4v13" />
                            <path d="M15 6v13" />
                        </svg>
                    </a>
                    <a
                        href="/escape"
                        aria-label="Escape"
                        title="Escape"
                        className="p-2 rounded-md hover:bg-green-50"
                        style={{ color: "#99c08e" }}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="5" />
                            <path d="M16 16l5 5" />
                        </svg>
                    </a>
                </nav>
            </div>
        </footer>
    );
}
