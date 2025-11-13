import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phoneNumber, imageUrl, title, description, link } = body;

        if (!phoneNumber || !/^01[0-9]{8,9}$/.test(phoneNumber.replace(/[-\s]/g, ""))) {
            return NextResponse.json({ error: "올바른 전화번호 형식이 아닙니다" }, { status: 400 });
        }

        const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
        const KAKAO_ADMIN_KEY = process.env.KAKAO_ADMIN_KEY; // 카카오톡 메시지 API용 Admin Key
        const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

        const cleanPhone = phoneNumber.replace(/[-\s]/g, "");
        const shareTitle = title || "DoNa Escape 콜라주";
        const shareDescription = description || "나의 콜라주를 확인해보세요";
        const shareLink = link || "";

        // 카카오톡 공유 메시지 구성
        const shareMessage = `${shareTitle}\n${shareDescription}\n${shareLink}${
            imageUrl ? `\n이미지: ${imageUrl}` : ""
        }`;

        // 카카오톡 링크 생성 - 전화번호로 메시지 보내기
        // 카카오톡 링크 스킴을 사용하여 해당 전화번호의 카카오톡으로 공유
        // 참고: 카카오톡 링크 스킴은 직접 전화번호로 메시지를 보낼 수 없지만,
        // 공유 링크를 생성하여 사용자가 해당 전화번호의 카카오톡으로 공유할 수 있도록 함

        // 카카오톡 공유 링크 (템플릿 이미지 포함)
        const kakaoShareUrl = imageUrl
            ? `https://kakaotalk://sendurl?url=${encodeURIComponent(shareLink)}&image=${encodeURIComponent(imageUrl)}`
            : `https://kakaotalk://sendurl?url=${encodeURIComponent(shareLink)}`;

        // 전화번호로 카카오톡 메시지 보내기 링크
        // 카카오톡 링크 스킴을 사용하여 해당 전화번호의 카카오톡으로 공유
        // 형식: kakaotalk://sendphone?phone=01012345678&text=메시지
        const kakaoPhoneLink = `kakaotalk://sendphone?phone=${cleanPhone}&text=${encodeURIComponent(shareMessage)}`;

        // SMS로 카카오톡 링크 전송
        // 사용자가 SMS를 받고 링크를 클릭하면 해당 전화번호의 카카오톡으로 메시지가 전송됨
        const smsBody = `[두나] ${shareTitle}\n${shareDescription}\n\n카카오톡으로 공유하기:\n${shareLink}\n\n카카오톡 링크: ${kakaoPhoneLink}`;

        return NextResponse.json({
            success: true,
            message: "카카오톡 공유 링크가 생성되었습니다",
            kakaoLink: kakaoPhoneLink, // 전화번호로 메시지 보내기 링크
            kakaoShareUrl: kakaoShareUrl, // 일반 공유 링크 (이미지 포함)
            kakaoPhoneLink: kakaoPhoneLink, // 전화번호로 직접 보내기 링크
            smsLink: `sms:${cleanPhone}?body=${encodeURIComponent(smsBody)}`,
            phoneNumber: cleanPhone,
            shareMessage: shareMessage,
            imageUrl: imageUrl,
            title: shareTitle,
            description: shareDescription,
            link: shareLink,
        });
    } catch (error: any) {
        console.error("카카오톡 공유 오류:", error);
        return NextResponse.json({ error: error?.message || "공유에 실패했습니다" }, { status: 500 });
    }
}
