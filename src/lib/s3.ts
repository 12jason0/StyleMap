import { S3Client } from "@aws-sdk/client-s3";

let _s3: S3Client | null = null;

export function getS3Client(): S3Client {
    if (_s3) return _s3;
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
    if (!region) {
        throw new Error("AWS_REGION (or AWS_DEFAULT_REGION) is required for S3 uploads");
    }
    _s3 = new S3Client({ region });
    return _s3;
}

export function getS3Bucket(): string {
    const bucket = process.env.S3_BUCKET_NAME || "";
    if (!bucket) throw new Error("S3_BUCKET_NAME is required");
    return bucket;
}

export function getS3PublicUrl(key: string): string {
    const customBase = process.env.S3_PUBLIC_BASE_URL; // e.g. https://cdn.example.com
    if (customBase) return `${customBase.replace(/\/$/, "")}/${key}`;
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "";
    const bucket = getS3Bucket();
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
