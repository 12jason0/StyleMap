import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
        return new Response(
            `
            <html>
                <body>
                    <script>
                        window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${error}' }, '${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }');
                        window.close();
                    </script>
                </body>
            </html>
        `,
            {
                headers: { "Content-Type": "text/html" },
            }
        );
    }

    if (!code) {
        return new Response(
            `
            <html>
                <body>
                    <script>
                        window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '인증 코드가 없습니다.' }, '${
                            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
                        }');
                        window.close();
                    </script>
                </body>
            </html>
        `,
            {
                headers: { "Content-Type": "text/html" },
            }
        );
    }

    try {
        // 액세스 토큰 교환
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                code,
                grant_type: "authorization_code",
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.error || "토큰 교환 실패");
        }

        // 사용자 정보 가져오기
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const userData = await userResponse.json();

        // 서버에 사용자 정보 전송
        const authResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken: tokenData.access_token }),
            }
        );

        const authData = await authResponse.json();

        if (authData.success) {
            return new Response(
                `
                <html>
                    <body>
                        <script>
                            window.opener.postMessage({ 
                                type: 'GOOGLE_AUTH_SUCCESS', 
                                code: '${code}',
                                user: ${JSON.stringify(authData.user)},
                                token: '${authData.token}'
                            }, '${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}');
                            window.close();
                        </script>
                    </body>
                </html>
            `,
                {
                    headers: { "Content-Type": "text/html" },
                }
            );
        } else {
            throw new Error(authData.error || "인증 실패");
        }
    } catch (error) {
        console.error("Google callback error:", error);
        return new Response(
            `
            <html>
                <body>
                    <script>
                        window.opener.postMessage({ 
                            type: 'GOOGLE_AUTH_ERROR', 
                            error: '${error instanceof Error ? error.message : "알 수 없는 오류"}' 
                        }, '${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}');
                        window.close();
                    </script>
                </body>
            </html>
        `,
            {
                headers: { "Content-Type": "text/html" },
            }
        );
    }
}
