import React from "react";
import WebScreen from "../components/WebScreen";
import { WEB_BASE } from "../config";

export default function MapScreen() {
    return <WebScreen uri={`${WEB_BASE}/map`} />;
}


