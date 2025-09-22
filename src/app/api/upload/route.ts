import { NextResponse, NextRequest } from "next/server";
import { PutObjectCommand, GetBucketLocationCommand } from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client, getS3PublicUrl, buildS3Client } from "@/lib/s3";
import { randomBytes } from "crypto"; // crypto 모듈 추가

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        // 1) 업로드 프록시 모드: FORWARD_UPLOAD_URL이 설정되어 있으면 해당 주소로 그대로 전달
        const forwardUrl = process.env.FORWARD_UPLOAD_URL || process.env.UPLOAD_FORWARD_URL;
        if (forwardUrl) {
            const originalForm = await request.formData();
            const forwardForm = new FormData();
            for (const [key, value] of originalForm.entries()) {
                forwardForm.append(key, value as any);
            }

            const resp = await fetch(forwardUrl, { method: "POST", body: forwardForm as any });
            const contentType = resp.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                const data = await resp.json().catch(() => ({}));
                return NextResponse.json(data, { status: resp.status });
            }
            const text = await resp.text();
            return new NextResponse(text, { status: resp.status });
        }

        // 2) 기본 모드: 서버에서 S3로 직접 업로드
        const form = await request.formData();
        const files = form.getAll("photos") as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ message: "업로드할 파일이 없습니다." }, { status: 400 });
        }

        async function getAlignedS3() {
            const baseClient = getS3Client();
            const bucket = getS3Bucket();
            try {
                const result = await baseClient.send(new GetBucketLocationCommand({ Bucket: bucket }));
                const detectedRegion = result.LocationConstraint || "us-east-1";
                const configuredRegion = process.env.AWS_REGION;
                const hasCustomEndpoint = Boolean(process.env.S3_ENDPOINT);
                if (!hasCustomEndpoint && configuredRegion && configuredRegion !== detectedRegion) {
                    return buildS3Client(detectedRegion);
                }
                return baseClient;
            } catch (_err) {
                return baseClient;
            }
        }

        const s3 = await getAlignedS3();
        const bucket = getS3Bucket();

        const uploadedUrls: string[] = [];
        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // --- ✨ 여기가 수정된 부분입니다 ✨ ---
            // 1. 파일 확장자를 안전하게 추출하고 정리합니다. (알파벳, 숫자만 남김)
            const originalExt = (file.name.split(".").pop() || "jpg").toLowerCase();
            const ext = originalExt.replace(/[^a-z0-9]/g, "");

            // 2. 안전하고 고유한 새 파일 이름을 생성합니다.
            const uniqueFileName = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
            const key = `uploads/${new Date().toISOString().slice(0, 10)}/${uniqueFileName}`;
            // --- ✨ 수정 끝 ---

            await s3.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: buffer,
                    ContentType: file.type || "image/jpeg",
                })
            );

            uploadedUrls.push(getS3PublicUrl(key));
        }

        return NextResponse.json({ success: true, photo_urls: uploadedUrls });
    } catch (error: any) {
        console.error("[S3 Upload Error]", error);
        // 환경 변수 설정 오류를 명시적으로 안내
        if (error.message.includes("S3 is not configured")) {
            return NextResponse.json({ message: "서버 S3 설정 오류입니다. 관리자에게 문의하세요." }, { status: 500 });
        }
        return NextResponse.json({ message: error?.message || "업로드 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
