import React from "react";
import WebScreen from "../components/WebScreen";
import { WEB_BASE } from "../config";

export default function MyPageScreen() {
    return <WebScreen uri={`${WEB_BASE}/mypage`} />;
}


