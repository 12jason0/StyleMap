import React, { useCallback, useRef, useState, useEffect, useContext } from "react";
import { BackHandler, Platform, StyleSheet, View, ActivityIndicator, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { loadAuthToken, saveAuthToken } from "../storage";
import { PushTokenContext } from "../../App";

type Props = {
    uri: string;
};

export default function WebScreen({ uri }: Props) {
    const webRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [canGoBack, setCanGoBack] = useState(false);
    const pushToken = useContext(PushTokenContext);
    const [initialScript, setInitialScript] = useState<string | null>(null);

    const sameHost = useCallback((url: string) => {
        try {
            const base = new URL(uri);
            const next = new URL(url);
            return base.host === next.host;
        } catch {
            return false;
        }
    }, [uri]);

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
            lines.push("window.__nativeBridge = { post: function(type, payload){ try { window.ReactNativeWebView.postMessage(JSON.stringify({type:type, payload:payload})); } catch(e){} } };");
            if (pushToken) {
                lines.push(`try{ localStorage.setItem('expoPushToken', '${pushToken}'); }catch(e){}`);
            }
            if (authToken) {
                lines.push(`try{ localStorage.setItem('authToken', '${authToken}'); }catch(e){}`);
            }
            // Listen for token updates from web
            lines.push("try{ window.addEventListener('message', function(e){ var d=e.data; if(typeof d==='string'){ try{ d=JSON.parse(d); }catch(_){} } if(d&&d.type==='setAuthToken'){ window.__nativeBridge.post('setAuthTokenAck', true); } }); }catch(e){}");
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
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
                injectedJavaScriptBeforeContentLoaded={initialScript}
                onMessage={async (ev) => {
                    try {
                        const data = JSON.parse(String(ev.nativeEvent.data || ""));
                        if (data?.type === 'setAuthToken') {
                            await saveAuthToken(String(data?.payload || ""));
                        }
                    } catch {}
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
                    const url = req.url;
                    // 전화/이메일 등 OS 핸들링
                    if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:")) {
                        Linking.openURL(url).catch(() => {});
                        return false;
                    }
                    // 같은 도메인은 웹뷰 내에서 열기, 외부는 시스템 브라우저로
                    if (sameHost(url)) return true;
                    Linking.openURL(url).catch(() => {});
                    return false;
                }}
            />)}
            {loading && (
                <View style={styles.loading} pointerEvents="none">
                    <ActivityIndicator size="small" color="#6db48c" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
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


