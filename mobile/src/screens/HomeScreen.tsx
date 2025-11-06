import React from "react";
import WebScreen from "../components/WebScreen";
import { WEB_BASE } from "../config";

export default function HomeScreen() {
    return <WebScreen uri={`${WEB_BASE}/`} />;
}


