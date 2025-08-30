import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const error_description = searchParams.get("error_description");

    console.log("Callback received:", { code: code ? "존재" : "없음", error, error_description });

    if (error) {
        console.error("Kakao auth error:", error, error_description);
        return new Response(
            `
            <html>
                <body>
                    <script>
                        console.error('Kakao auth error:', '${error}', '${error_description}');
                        window.opener?.postMessage({ 
                            type: 'KAKAO_AUTH_ERROR', 
                            error: '${error}',
                            error_description: '${error_description}'
                        }, '${process.env.NEXT_PUBLIC_APP_URL}');
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
        console.error("No authorization code received");
        return new Response(
            `
            <html>
                <body>
                    <script>
                        console.error('No authorization code received');
                        window.opener?.postMessage({ 
                            type: 'KAKAO_AUTH_ERROR', 
                            error: '인증 코드가 없습니다.' 
                        }, '${process.env.NEXT_PUBLIC_APP_URL}');
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

    // 성공 시 부모 창에 코드 전달
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return new Response(
        `
        <html>
            <body>
                <script>
                    console.log('Authorization code received:', '${code}');
                    window.opener?.postMessage({ 
                        type: 'KAKAO_AUTH_CODE', 
                        code: '${code}'
                    }, '${appUrl}');
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
