import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client, getS3PublicUrl } from "@/lib/s3";

export async function POST(request: Request) {
    try {
        const form = await request.formData();
        const files = form.getAll("photos");

        const validFiles = files.filter((f) => typeof f === "object" && f !== null) as File[];
        if (validFiles.length < 2) {
            return NextResponse.json({ message: "사진 2장을 업로드해 주세요." }, { status: 400 });
        }

        const s3 = getS3Client();
        const bucket = getS3Bucket();

        const uploadedUrls: string[] = [];
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
            const key = `uploads/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${i}.${ext}`;

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
        return NextResponse.json({ message: error?.message || "업로드 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
