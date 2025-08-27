import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface TrackingEvent {
  userId: string;
  eventType: 'view' | 'like' | 'book' | 'search' | 'share' | 'click' | 'time_spent';
  courseId?: string;
  searchQuery?: string;
  timeSpent?: number;
  metadata?: {
    source?: string;
    position?: number;
    category?: string;
    [key: string]: any;
  };
  timestamp: Date;
}

export async function POST(request: NextRequest) {
  try {
    const events: TrackingEvent[] = await request.json();

    for (const event of events) {
      // 기존 사용자 행동 데이터 조회
      let userBehavior = await prisma.userBehavior.findUnique({
        where: { userId: event.userId }
      });

      if (!userBehavior) {
        // 사용자 행동 데이터가 없으면 새로 생성
        userBehavior = await prisma.userBehavior.create({
          data: {
            userId: event.userId,
            viewedCourses: [],
            bookedCourses: [],
            likedCourses: [],
            searchHistory: [],
            timeSpent: {},
            preferences: {},
            lastActiveAt: new Date()
          }
        });
      }

      // 이벤트 타입별 처리
      switch (event.eventType) {
        case 'view':
          if (event.courseId) {
            const viewedCourses = Array.isArray(userBehavior.viewedCourses) 
              ? userBehavior.viewedCourses as string[]
              : [];
            
            // 중복 제거하고 최근 것을 앞에 추가
            const updatedViewed = [
              event.courseId,
              ...viewedCourses.filter(id => id !== event.courseId)
            ].slice(0, 100); // 최근 100개만 유지

            await prisma.userBehavior.update({
              where: { userId: event.userId },
              data: {
                viewedCourses: updatedViewed,
                lastActiveAt: new Date()
              }
            });
          }
          break;

        case 'like':
          if (event.courseId) {
            const likedCourses = Array.isArray(userBehavior.likedCourses)
              ? userBehavior.likedCourses as string[]
              : [];

            const updatedLiked = likedCourses.includes(event.courseId)
              ? likedCourses.filter(id => id !== event.courseId) // Unlike
              : [...likedCourses, event.courseId]; // Like

            await prisma.userBehavior.update({
              where: { userId: event.userId },
              data: {
                likedCourses: updatedLiked,
                lastActiveAt: new Date()
              }
            });
          }
          break;

        case 'book':
          if (event.courseId) {
            const bookedCourses = Array.isArray(userBehavior.bookedCourses)
              ? userBehavior.bookedCourses as string[]
              : [];

            if (!bookedCourses.includes(event.courseId)) {
              await prisma.userBehavior.update({
                where: { userId: event.userId },
                data: {
                  bookedCourses: [...bookedCourses, event.courseId],
                  lastActiveAt: new Date()
                }
              });
            }
          }
          break;

        case 'search':
          if (event.searchQuery) {
            const searchHistory = Array.isArray(userBehavior.searchHistory)
              ? userBehavior.searchHistory as string[]
              : [];

            const updatedSearch = [
              event.searchQuery,
              ...searchHistory.filter(query => query !== event.searchQuery)
            ].slice(0, 50); // 최근 50개만 유지

            await prisma.userBehavior.update({
              where: { userId: event.userId },
              data: {
                searchHistory: updatedSearch,
                lastActiveAt: new Date()
              }
            });
          }
          break;

        case 'time_spent':
          if (event.courseId && event.timeSpent) {
            const timeSpent = (userBehavior.timeSpent as { [key: string]: number }) || {};
            
            await prisma.userBehavior.update({
              where: { userId: event.userId },
              data: {
                timeSpent: {
                  ...timeSpent,
                  [event.courseId]: (timeSpent[event.courseId] || 0) + event.timeSpent
                },
                lastActiveAt: new Date()
              }
            });
          }
          break;
      }

      // 상세 이벤트 로그 저장 (분석용)
      await prisma.trackingEvent.create({
        data: {
          userId: event.userId,
          eventType: event.eventType,
          courseId: event.courseId,
          searchQuery: event.searchQuery,
          timeSpent: event.timeSpent,
          metadata: event.metadata || {},
          timestamp: event.timestamp || new Date()
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tracking error:", error);
    return NextResponse.json({ 
      error: "Failed to track user behavior" 
    }, { status: 500 });
  }
}
