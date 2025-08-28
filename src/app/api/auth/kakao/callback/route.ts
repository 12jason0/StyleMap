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
                        window.opener.postMessage({ type: 'KAKAO_AUTH_ERROR', error: '${error}' }, '${
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
                        window.opener.postMessage({ type: 'KAKAO_AUTH_ERROR', error: '인증 코드가 없습니다.' }, '${
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
        // 서버에 인증 코드 전송
        const authResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/kakao`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
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
                                type: 'KAKAO_AUTH_SUCCESS', 
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
        console.error("Kakao callback error:", error);
        return new Response(
            `
            <html>
                <body>
                    <script>
                        window.opener.postMessage({ 
                            type: 'KAKAO_AUTH_ERROR', 
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
