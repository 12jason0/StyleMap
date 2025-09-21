import { S3Client } from "@aws-sdk/client-s3";

let _s3: S3Client | null = null;

function getS3Config() {
    // --- 디버깅 로그 시작 ---
    console.log("--- [S3 설정 확인] 환경 변수를 읽는 중입니다 ---");
    const region = process.env.AWS_REGION;
    const bucket = process.env.S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // 각 변수가 제대로 로드되었는지 터미널에 출력합니다.
    console.log(`AWS_REGION: ${region ? "✅ 로드됨" : "❌ 누락됨"}`);
    console.log(`S3_BUCKET_NAME: ${bucket ? "✅ 로드됨" : "❌ 누락됨"}`);
    console.log(`AWS_ACCESS_KEY_ID: ${accessKeyId ? `✅ 로드됨 (...${accessKeyId.slice(-4)})` : "❌ 누락됨"}`);
    console.log(`AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? "✅ 로드됨" : "❌ 누락됨"}`);
    console.log("-------------------------------------------------");
    // --- 디버깅 로그 끝 ---

    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
        // 이 오류 메시지가 표시된다면, 위의 로그에서 '누락됨' 부분을 확인하세요.
        throw new Error(
            "S3 is not configured. Please check AWS_REGION, S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables."
        );
    }

    return { region, bucket, credentials: { accessKeyId, secretAccessKey } };
}

export function getS3Client(): S3Client {
    if (_s3) return _s3;
    const { region, credentials } = getS3Config();
    _s3 = new S3Client({ region, credentials });
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
