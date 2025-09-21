import { S3Client } from "@aws-sdk/client-s3";

let _s3: S3Client | null = null;

function getS3Config() {
    // --- 디버깅 로그 시작 ---
    console.log("--- [S3 설정 확인] 환경 변수를 읽는 중입니다 ---");
    const regionFromAws = process.env.AWS_REGION;
    const regionFromAwsDefault = process.env.AWS_DEFAULT_REGION;
    const regionFromS3 = process.env.S3_REGION;
    const regionFromAwsS3 = process.env.AWS_S3_REGION;
    const bucket = process.env.S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const endpoint = process.env.S3_ENDPOINT; // e.g. https://s3.ap-southeast-2.amazonaws.com or R2/MinIO endpoint
    const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || "").toLowerCase() === "true";

    // 각 변수가 제대로 로드되었는지 터미널에 출력합니다.
    const resolvedRegion =
        regionFromAws || regionFromAwsDefault || regionFromS3 || regionFromAwsS3 || (endpoint ? "us-east-1" : "");
    console.log(
        `AWS_REGION candidates => AWS_REGION: ${regionFromAws ? "✅" : "❌"}, AWS_DEFAULT_REGION: ${
            regionFromAwsDefault ? "✅" : "❌"
        }, S3_REGION: ${regionFromS3 ? "✅" : "❌"}, AWS_S3_REGION: ${regionFromAwsS3 ? "✅" : "❌"}`
    );
    console.log(`Resolved region: ${resolvedRegion ? resolvedRegion : "(empty)"}`);
    console.log(`S3_BUCKET_NAME: ${bucket ? "✅ 로드됨" : "❌ 누락됨"}`);
    console.log(`AWS_ACCESS_KEY_ID: ${accessKeyId ? `✅ 로드됨 (...${accessKeyId.slice(-4)})` : "❌ 누락됨"}`);
    console.log(`AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? "✅ 로드됨" : "❌ 누락됨"}`);
    console.log("-------------------------------------------------");
    // --- 디버깅 로그 끝 ---

    if (!resolvedRegion || !bucket || !accessKeyId || !secretAccessKey) {
        // 이 오류 메시지가 표시된다면, 위의 로그에서 '누락됨' 부분을 확인하세요.
        throw new Error(
            "S3 is not configured. Set one of [AWS_REGION, AWS_DEFAULT_REGION, S3_REGION, AWS_S3_REGION], and ensure S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY are set."
        );
    }

    return {
        region: resolvedRegion,
        bucket,
        credentials: { accessKeyId, secretAccessKey },
        endpoint,
        forcePathStyle,
    } as const;
}

export function getS3Client(): S3Client {
    if (_s3) return _s3;
    const { region, credentials, endpoint, forcePathStyle } = getS3Config();
    const base = { region, credentials } as any;
    if (endpoint) base.endpoint = endpoint;
    if (forcePathStyle) base.forcePathStyle = true;
    _s3 = new S3Client(base);
    return _s3;
}

export function getS3Bucket(): string {
    return getS3Config().bucket;
}

export function getS3PublicUrl(key: string): string {
    const { region, bucket } = getS3Config();
    const customBase = process.env.S3_PUBLIC_BASE_URL; // e.g. https://cdn.example.com
    if (customBase) {
        return `${customBase.replace(/\/$/, "")}/${key}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// 동일한 자격증명/엔드포인트를 유지하면서 리전만 바꾼 클라이언트를 생성합니다.
export function buildS3Client(regionOverride?: string): S3Client {
    const { region, credentials, endpoint, forcePathStyle } = getS3Config();
    const effectiveRegion = regionOverride || region;
    const base = { region: effectiveRegion, credentials } as any;
    if (endpoint) base.endpoint = endpoint;
    if (forcePathStyle) base.forcePathStyle = true;
    return new S3Client(base);
}
