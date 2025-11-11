import React, { useCallback, useRef, useState, useEffect, useContext } from "react";
import { BackHandler, Platform, StyleSheet, View, ActivityIndicator, Linking } from "react-native";

import { WebView } from "react-native-webview";
import { loadAuthToken, saveAuthToken } from "../storage";
import { PushTokenContext } from "../context/PushTokenContext";
import { registerPushToken } from "../utils/registerPushToken";

type Props = {
    uri: string;
};

export default function WebScreen({ uri }: Props) {
    const webRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [canGoBack, setCanGoBack] = useState(false);
    const pushToken = useContext(PushTokenContext);
    const [initialScript, setInitialScript] = useState<string | null>(null);

    const sameHost = useCallback(
        (url: string) => {
            try {
                const base = new URL(uri);
                const next = new URL(url);
                return base.host === next.host;
            } catch {
                return false;
            }
        },
        [uri]
    );

    const handleAndroidBack = useCallback(() => {
        if (canGoBack && webRef.current) {
            webRef.current.goBack();
            return true; // consume
        }
        return false; // let OS handle (app-level back)
    }, [canGoBack]);

    useEffect(() => {
        if (Platform.OS !== "android") return;
        const sub = BackHandler.addEventListener("hardwareBackPress", handleAndroidBack);
        return () => sub.remove();
    }, [handleAndroidBack]);

    // Build injected JS with latest tokens
    useEffect(() => {
        (async () => {
            const authToken = await loadAuthToken();
            const lines: string[] = [];
            lines.push("(function(){");
            lines.push(
                "window.__nativeBridge = { post: function(type, payload){ try { window.ReactNativeWebView.postMessage(JSON.stringify({type:type, payload:payload})); } catch(e){} } };"
            );
            if (pushToken) {
                lines.push(`try{ localStorage.setItem('expoPushToken', '${pushToken}'); }catch(e){}`);
            }
            if (authToken) {
                lines.push(`try{ localStorage.setItem('authToken', '${authToken}'); }catch(e){}`);
            }
            // Listen for token updates and login events from web
            lines.push(`
    try {
        window.addEventListener('message', function(e) {
            var d = e.data;
            if (typeof d === 'string') {
                try { d = JSON.parse(d); } catch(_) {}
            }
            
            // 로그인 성공 시
            if (d && d.type === 'loginSuccess' && d.userId) {
                window.__nativeBridge.post('loginSuccess', { userId: d.userId });
            }
            
            // 토큰 저장 확인
            if (d && d.type === 'setAuthToken') {
                window.__nativeBridge.post('setAuthTokenAck', true);
            }
        });
    } catch(e) {}
`);
            // 웹 하단 탭바(고정 footer) 숨김: 앱 내 중복 하단바 제거
            // 중복된 하단 탭바 중 아래쪽 것만 숨기기
            lines.push(`
    (function tuneBarsAndHeader(){
        function hideOnlyDuplicateBar(){
            try{
                var nodes = Array.prototype.slice.call(document.querySelectorAll('*'));
                var fixedBottom = [];
                nodes.forEach(function(el){
                    var cs = window.getComputedStyle(el);
                    if (!cs) return;
                    var pos = cs.position;
                    var bottomVal = cs.bottom || 'auto';
                    var bottom = parseInt(bottomVal === 'auto' ? '0' : bottomVal, 10);
                    var rect = el.getBoundingClientRect();
                    var atBottom = rect.bottom >= (window.innerHeight - 2) || bottom <= 2;
                    var plausibleHeight = rect.height > 20 && rect.height < 140;
                    var wideEnough = rect.width > (window.innerWidth * 0.5);
                    if ((pos === 'fixed' || pos === 'sticky') && atBottom && plausibleHeight && wideEnough) {
                        fixedBottom.push({el: el, bottom: rect.bottom, h: rect.height});
                    }
                });
                
                // 여러 개가 있으면 가장 아래에 있는 것만 숨기기
                if (fixedBottom.length > 1) {
                    fixedBottom.sort(function(a, b){ return b.bottom - a.bottom; });
                    // 가장 아래쪽 탭바만 숨기기
                    try{ fixedBottom[0].el.style.display = 'none'; }catch(e){}
                }
            }catch(e){}
        }
        
        function fixHeader(){
            try{
                // 하단 네이티브 탭바와 겹침 방지용 여백
                var style = document.createElement('style');
                style.textContent = 'body{ padding-bottom: 100px !important; }';
                document.head.appendChild(style);
                var nodes = Array.prototype.slice.call(document.querySelectorAll('*'));
                nodes.forEach(function(el){
                    var cs = window.getComputedStyle(el);
                    if (!cs) return;
                    var pos = cs.position;
                    var topVal = cs.top || 'auto';
                    var top = parseInt(topVal === 'auto' ? '0' : topVal, 10);
                    var rect = el.getBoundingClientRect();
                    var nearTop = rect.top <= 2 || top <= 2;
                    var plausibleHeight = rect.height > 40 && rect.height < 200;
                    if (pos === 'fixed' && nearTop && plausibleHeight) {
                        el.style.top = 'calc(env(safe-area-inset-top, 0px))';
                    }
                });
            }catch(e){}
        }
        
        document.addEventListener('DOMContentLoaded', hideOnlyDuplicateBar);
        window.addEventListener('load', hideOnlyDuplicateBar);
        setTimeout(hideOnlyDuplicateBar, 300);
        setTimeout(hideOnlyDuplicateBar, 1000);

        document.addEventListener('DOMContentLoaded', fixHeader);
        window.addEventListener('load', fixHeader);
        setTimeout(fixHeader, 300);
        setTimeout(fixHeader, 1000);
    })();
`);
            lines.push("})();");
            setInitialScript(lines.join("\n"));
        })();
    }, [pushToken, uri]);

    return (
        <View style={styles.container}>
            {!!initialScript && (
                <WebView
                    ref={webRef}
                    source={{ uri }}
                    contentInsetAdjustmentBehavior="automatic"
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
                    injectedJavaScriptBeforeContentLoaded={initialScript}
                    onMessage={async (ev) => {
                        try {
                            const data = JSON.parse(String(ev.nativeEvent.data || ""));

                            // 토큰 저장
                            if (data?.type === "setAuthToken") {
                                await saveAuthToken(String(data?.payload || ""));
                            }

                            // 로그인 성공 시 푸시 토큰 등록
                            if (data?.type === "loginSuccess") {
                                const userId = data?.payload?.userId ?? data?.userId ?? null;
                                const tokenFromMsg = data?.token ?? data?.payload?.token ?? null;
                                if (tokenFromMsg) {
                                    await saveAuthToken(String(tokenFromMsg));
                                }
                                if (userId && pushToken) {
                                    console.log("로그인 감지, 푸시 토큰 등록:", userId);
                                    await registerPushToken(userId, pushToken);
                                }
                            }
                        } catch (e) {
                            console.error("WebView message 처리 오류:", e);
                        }
                    }}
                    onFileDownload={({ nativeEvent }) => {
                        const { downloadUrl } = nativeEvent;
                        if (downloadUrl) {
                            Linking.openURL(downloadUrl).catch(() => {});
                        }
                    }}
                    incognito={false}
                    allowsBackForwardNavigationGestures
                    setSupportMultipleWindows={false}
                    originWhitelist={["*"]}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    pullToRefreshEnabled={Platform.OS === "android"}
                    onShouldStartLoadWithRequest={(req) => {
                        const url = req.url || "";
                        // OS가 처리해야 하는 스킴만 외부로 전달
                        if (
                            url.startsWith("tel:") ||
                            url.startsWith("mailto:") ||
                            url.startsWith("sms:") ||
                            url.startsWith("intent:")
                        ) {
                            Linking.openURL(url).catch(() => {});
                            return false;
                        }
                        // http/https 내비게이션은 모두 WebView 안에서 처리
                        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("about:blank")) {
                            return true;
                        }
                        // 나머지는 기본적으로 허용
                        return true;
                    }}
                />
            )}
            {loading && (
                <View style={styles.loading} pointerEvents="none">
                    <ActivityIndicator size="small" color="#6db48c" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", paddingTop: Platform.OS === "ios" ? 44 : 0 },
    loading: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "rgba(255,255,255,0.85)",
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
    },
});
