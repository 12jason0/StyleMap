import { useState, useEffect } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { saveCourses, loadCourses, initDB } from "../utils/storage";

export const useOfflineSync = () => {
    const [isOnline, setIsOnline] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    useEffect(() => {
        // DB 초기화
        initDB().catch(console.error);

        // 네트워크 상태 감지
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            const connected = state.isConnected ?? true;
            setIsOnline(connected);

            if (connected && !isOnline) {
                // 오프라인에서 온라인 복귀시 동기화
                syncData();
            }
        });

        // 초기 데이터 로드
        loadData();

        return () => unsubscribe();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            if (isOnline) {
                // 온라인: 서버에서 가져오기
                try {
                    const response = await fetch("https://dona.io.kr/api/courses");

                    if (!response.ok) {
                        throw new Error("Failed to fetch");
                    }

                    const serverData = await response.json();

                    // 로컬에 저장
                    await saveCourses(serverData);
                    setCourses(serverData);
                    setLastSync(new Date());
                } catch (error) {
                    console.error("서버 데이터 로드 실패:", error);
                    // 서버 실패시 로컬 데이터 사용
                    const localData = await loadCourses();
                    setCourses(localData);
                }
            } else {
                // 오프라인: 로컬에서 읽기
                const localData = await loadCourses();
                setCourses(localData);
            }
        } catch (error) {
            console.error("데이터 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    const syncData = async () => {
        if (!isOnline) return;

        try {
            const response = await fetch("https://dona.io.kr/api/courses");
            const serverData = await response.json();
            await saveCourses(serverData);
            setCourses(serverData);
            setLastSync(new Date());
        } catch (error) {
            console.error("동기화 실패:", error);
        }
    };

    return {
        courses,
        loading,
        isOnline,
        lastSync,
        refresh: loadData,
        sync: syncData,
    };
};
