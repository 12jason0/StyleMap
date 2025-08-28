"use client";

import { useEffect } from "react";

export default function FacebookSDK() {
    useEffect(() => {
        // Facebook SDK가 이미 로드되었는지 확인
        if (typeof window !== "undefined" && !window.FB) {
            // Facebook SDK 초기화
            window.fbAsyncInit = function () {
                window.FB.init({
                    appId: "4072575589668058",
                    cookie: true,
                    xfbml: true,
                    version: "v19.0",
                });

                window.FB.AppEvents.logPageView();
            };

            // Facebook SDK 스크립트 로드
            (function (d, s, id) {
                var js,
                    fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s);
                js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
            })(document, "script", "facebook-jssdk");
        }
    }, []);

    return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}
