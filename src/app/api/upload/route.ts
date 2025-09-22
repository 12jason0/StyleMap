import { NextResponse, NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client, getS3PublicUrl } from "@/lib/s3";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    console.log("[/api/upload] Received a request."); // 로그 추가

    try {
        const form = await request.formData();
        const files = form.getAll("photos") as File[];

        if (!files || files.length === 0) {
            console.log("[/api/upload] No files found in the request."); // 로그 추가
            return NextResponse.json({ message: "업로드할 파일이 없습니다." }, { status: 400 });
        }

        console.log(`[/api/upload] Found ${files.length} file(s) to process.`); // 로그 추가

        const s3 = getS3Client();
        const bucket = getS3Bucket();

        console.log(`[/api/upload] Attempting to upload to S3 bucket: ${bucket}`); // 로그 추가

        const uploadedUrls: string[] = [];
        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());

            // --- ✨ 추가적으로 강화된 파일 이름 생성 로직 ---
            const originalExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
            // S3가 허용하는 안전한 문자만 남깁니다: a-z, A-Z, 0-9, !, -, _, ., *, ', (, )
            // 마침표(.)는 확장자 앞에만 있도록 처리합니다.
            const safeExt = originalExt.replace(/[^a-z0-9]/g, "").slice(0, 10);

            const uniqueFileName = `${Date.now()}-${randomBytes(8).toString("hex")}.${safeExt}`;
            const key = `uploads/${new Date().toISOString().slice(0, 10)}/${uniqueFileName}`;

            // ❗ 어떤 Key가 생성되었는지 로그로 확인
            console.log(`[/api/upload] Generated S3 Key: ${key}`);
            console.log(`[/api/upload] File MIME type: ${file.type}`);

            await s3.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: buffer,
                    ContentType: file.type || "image/jpeg",
                })
            );

            const publicUrl = getS3PublicUrl(key);
            console.log(`[/api/upload] Successfully uploaded. Public URL: ${publicUrl}`); // 로그 추가
            uploadedUrls.push(publicUrl);
        }

        return NextResponse.json({ success: true, photo_urls: uploadedUrls });
    } catch (error: any) {
        // ❗ 어떤 오류가 발생했는지 정확히 로그로 확인
        console.error("[/api/upload] CRITICAL ERROR:", error);
        console.error("[/api/upload] Error Name:", error.name);
        console.error("[/api/upload] Error Message:", error.message);
        console.error("[/api/upload] Error Stack:", error.stack);

        return NextResponse.json({ message: error?.message || "업로드 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
