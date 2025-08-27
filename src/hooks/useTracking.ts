import { useEffect, useRef, useState } from 'react';
import { UserTracker } from '@/lib/tracking';

export const useTracking = (userId: string) => {
  const [tracker] = useState(() => new UserTracker(userId));
  const viewStartTime = useRef<number>(Date.now());

  // 페이지/컴포넌트 마운트 시 시작 시간 기록
  useEffect(() => {
    viewStartTime.current = Date.now();
  }, []);

  // 페이지/컴포넌트 언마운트 시 머문 시간 기록
  useEffect(() => {
    return () => {
      const timeSpent = Date.now() - viewStartTime.current;
      if (timeSpent > 1000) { // 1초 이상 머문 경우만 기록
        // 현재 페이지의 코스 ID가 있다면 추적
        const pathSegments = window.location.pathname.split('/');
        if (pathSegments[1] === 'courses' && pathSegments[2]) {
          tracker.trackTimeSpent(pathSegments[2], timeSpent);
        }
      }
    };
  }, [tracker]);

  return tracker;
};
