export async function composeImageWithTemplate(
    userImageUrl: string,
    templateUrl: string = "/images/escape-template.png"
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            reject(new Error("Canvas context를 생성할 수 없습니다."));
            return;
        }

        const template = new Image();
        const userImage = new Image();
        template.crossOrigin = "anonymous";
        userImage.crossOrigin = "anonymous";

        let loadedCount = 0;
        const onImageLoad = () => {
            loadedCount++;
            if (loadedCount !== 2) return;
            try {
                // 템플릿 크기 기준
                canvas.width = template.width;
                canvas.height = template.height;

                // 배경 흰색
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 사용자 이미지 중앙 배치 (비율 유지)
                const scale = Math.min(
                    (canvas.width * 0.8) / userImage.width,
                    (canvas.height * 0.8) / userImage.height
                );
                const drawW = userImage.width * scale;
                const drawH = userImage.height * scale;
                const x = (canvas.width - drawW) / 2;
                const y = (canvas.height - drawH) / 2;
                ctx.drawImage(userImage, x, y, drawW, drawH);

                // 템플릿 오버레이
                ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("이미지 변환에 실패했습니다."));
                    },
                    "image/png",
                    1.0
                );
            } catch (e) {
                reject(e);
            }
        };

        template.onerror = () => reject(new Error("템플릿 이미지를 불러올 수 없습니다."));
        userImage.onerror = () => reject(new Error("사용자 이미지를 불러올 수 없습니다."));

        template.onload = onImageLoad;
        userImage.onload = onImageLoad;

        template.src = templateUrl;
        userImage.src = userImageUrl;
    });
}

export async function downloadImage(blob: Blob, filename: string = "dona-escape.png") {
    const url = URL.createObjectURL(blob);
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    try {
        // 1) Web Share API 시도 (모바일 우선)
        const navAny = navigator as any;
        if (isMobile && navAny?.share && navAny?.canShare) {
            const file = new File([blob], filename, { type: "image/png" });
            if (navAny.canShare({ files: [file] })) {
                await navAny.share({ files: [file], title: "DoNa Escape", text: "DoNa 코스를 완료했어요! 🎉" });
                URL.revokeObjectURL(url);
                return { success: true, method: "share" as const };
            }
        }

        // 2) iOS: base64 data URL을 HTML로 감싸서 새 탭에 표시 (길게 눌러 저장 가능)
        if (isIOS) {
            // Blob → base64 data URL
            const base64: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error("iOS base64 변환 실패"));
                reader.readAsDataURL(blob);
            });

            const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta charset="utf-8" />
<title>이미지 저장</title>
<style>
  body{margin:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  img{max-width:100%;height:auto;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);margin:16px}
  .guide{color:#fff;text-align:center;max-width:420px;padding:16px 20px;background:rgba(255,255,255,.08);border-radius:12px}
</style>
</head>
<body>
  <img src="${base64}" alt="image" />
  <div class="guide">이미지를 길게 눌러 "사진에 추가"를 선택하세요.</div>
</body>
</html>`;

            const w = window.open("about:blank", "_blank");
            if (w) {
                w.document.open();
                w.document.write(html);
                w.document.close();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                return {
                    success: true,
                    method: "ios-manual" as const,
                    message: '이미지를 길게 눌러서 "사진에 추가"를 선택해주세요.',
                };
            } else {
                // 팝업 차단 시 현재 탭으로 강제 표시
                document.open();
                document.write(html);
                document.close();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                return {
                    success: true,
                    method: "ios-manual" as const,
                    message: '이미지를 길게 눌러서 "사진에 추가"를 선택해주세요.',
                };
            }
        }

        // 3) 일반 다운로드 (데스크톱/Android)
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return { success: true, method: "download" as const };
    } catch (error) {
        console.error("이미지 저장 실패:", error);
        URL.revokeObjectURL(url);
        throw error;
    }
}
