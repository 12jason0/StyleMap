import { S3Client } from "@aws-sdk/client-s3";

let _s3: S3Client | null = null;

function resolveRegion(): string | undefined {
    return (
        process.env.AWS_REGION ||
        process.env.AWS_DEFAULT_REGION ||
        process.env.S3_REGION ||
        process.env.AWS_S3_REGION ||
        process.env.NEXT_PUBLIC_AWS_REGION
    );
}

function resolveBucket(): string | undefined {
    return (
        process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || process.env.NEXT_PUBLIC_S3_BUCKET_NAME || undefined
    );
}

function resolveCredentials(): { accessKeyId: string; secretAccessKey: string; sessionToken?: string } | undefined {
    const accessKeyId =
        process.env.AWS_ACCESS_KEY_ID ||
        process.env.AWS_S3_ACCESS_KEY_ID ||
        process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ||
        "";
    const secretAccessKey =
        process.env.AWS_SECRET_ACCESS_KEY ||
        process.env.AWS_S3_SECRET_ACCESS_KEY ||
        process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY ||
        "";
    const sessionToken = process.env.AWS_SESSION_TOKEN || undefined;
    if (accessKeyId && secretAccessKey) return { accessKeyId, secretAccessKey, sessionToken };
    return undefined;
}

export function getS3Client(): S3Client {
    if (_s3) return _s3;
    const region = resolveRegion();
    if (!region) {
        // 환경 변수 미설정 시 명확한 메시지와 힌트 제공
        throw new Error("AWS_REGION (or compatible region env) is required for S3 uploads");
    }
    const credentials = resolveCredentials();
    _s3 = new S3Client(credentials ? { region, credentials } : { region });
    return _s3;
}

export function getS3Bucket(): string {
    const bucket = resolveBucket();
    if (!bucket) throw new Error("S3_BUCKET_NAME (or compatible bucket env) is required");
    return bucket;
}

export function getS3PublicUrl(key: string): string {
    const customBase = process.env.S3_PUBLIC_BASE_URL; // e.g. https://cdn.example.com
    if (customBase) return `${customBase.replace(/\/$/, "")}/${key}`;
    const region = resolveRegion() || "";
    const bucket = getS3Bucket();
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
