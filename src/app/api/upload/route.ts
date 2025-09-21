import { NextResponse, NextRequest } from "next/server";
import { PutObjectCommand, GetBucketLocationCommand } from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client, getS3PublicUrl, buildS3Client } from "@/lib/s3";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const form = await request.formData();
        const files = form.getAll("photos") as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ message: "업로드할 파일이 없습니다." }, { status: 400 });
        }

        // Escape 미션에서는 2장을 요구하지만, 다른 곳에서도 재사용될 수 있도록 유연하게 처리
        // const requiredFiles = 2;
        // if (files.length < requiredFiles) {
        //     return NextResponse.json({ message: `사진을 ${requiredFiles}장 업로드해 주세요.` }, { status: 400 });
        // }

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
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
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
        console.error("[S3 Upload Error]", error);
        // 환경 변수 설정 오류를 명시적으로 안내
        if (error.message.includes("S3 is not configured")) {
            return NextResponse.json({ message: "서버 S3 설정 오류입니다. 관리자에게 문의하세요." }, { status: 500 });
        }
        return NextResponse.json({ message: error?.message || "업로드 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
