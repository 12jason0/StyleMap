import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        // 실제로는 데이터베이스에서 특정 알림을 삭제
        console.log(`Deleting notification ${id}`);

        return NextResponse.json({
            success: true,
            message: `Notification ${id} deleted`,
        });
    } catch (error) {
        console.error("Failed to delete notification:", error);
        return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
    }
}
