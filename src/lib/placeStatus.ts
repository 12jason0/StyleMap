/**
 * 장소 영업 상태 계산 유틸리티
 */

export type PlaceStatus = "영업중" | "곧 마감" | "휴무" | "영업종료" | "정보 없음";

export interface PlaceStatusInfo {
    status: PlaceStatus;
    message: string;
    isOpen: boolean;
    nextOpenTime?: string;
}

interface PlaceClosedDay {
    day_of_week: number | null; // 0=일요일, 1=월요일, ..., 6=토요일
    specific_date: Date | string | null;
    note?: string | null;
}

/**
 * 오늘이 휴무일인지 확인
 */
function isClosedToday(closedDays: PlaceClosedDay[]): boolean {
    if (!closedDays || closedDays.length === 0) return false;

    const now = new Date();
    const today = now.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    const todayDateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    return closedDays.some((closedDay) => {
        // 요일별 휴무 확인
        if (closedDay.day_of_week !== null && closedDay.day_of_week === today) {
            return true;
        }

        // 특정 날짜 휴무 확인
        if (closedDay.specific_date) {
            const closedDate = new Date(closedDay.specific_date);
            const closedDateStr = closedDate.toISOString().split("T")[0];
            if (closedDateStr === todayDateStr) {
                return true;
            }
        }

        return false;
    });
}

/**
 * 영업시간 문자열 파싱
 * 지원 형식:
 * - "09:00-22:00" (단순 형식)
 * - "월-금: 09:00-18:00, 토-일: 10:00-20:00" (요일별 형식)
 * - "매일 09:00-22:00"
 */
function parseOpeningHours(openingHours: string | null | undefined): {
    todayHours: { open: string; close: string } | null;
    allHours: string;
} {
    if (!openingHours) {
        return { todayHours: null, allHours: "" };
    }

    const now = new Date();
    const today = now.getDay();

    // 요일 매핑
    const dayMap: { [key: number]: string } = {
        0: "일",
        1: "월",
        2: "화",
        3: "수",
        4: "목",
        5: "금",
        6: "토",
    };

    const todayName = dayMap[today];

    // ✅ 공백 포함 단순 형식: "17:30 - 23:30" 또는 "09:00-22:00"
    const simpleFormat = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;
    const simpleMatch = openingHours.trim().match(simpleFormat);
    if (simpleMatch) {
        return {
            todayHours: {
                open: `${simpleMatch[1].padStart(2, "0")}:${simpleMatch[2]}`,
                close: `${simpleMatch[3].padStart(2, "0")}:${simpleMatch[4]}`,
            },
            allHours: openingHours,
        };
    }

    // 요일별 형식: "월-금: 09:00-18:00, 토-일: 10:00-20:00"
    const dayRangePattern = /([월화수목금토일]+)-([월화수목금토일]+):\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
    const singleDayPattern = /([월화수목금토일]):\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;

    let match;
    let todayHours: { open: string; close: string } | null = null;

    // 요일 범위 매칭
    while ((match = dayRangePattern.exec(openingHours)) !== null) {
        const startDay = match[1];
        const endDay = match[2];
        const openTime = `${match[3].padStart(2, "0")}:${match[4]}`;
        const closeTime = `${match[5].padStart(2, "0")}:${match[6]}`;

        const dayOrder = ["일", "월", "화", "수", "목", "금", "토"];
        const startIdx = dayOrder.indexOf(startDay);
        const endIdx = dayOrder.indexOf(endDay);
        const todayIdx = dayOrder.indexOf(todayName);

        if (
            (startIdx <= endIdx && todayIdx >= startIdx && todayIdx <= endIdx) ||
            (startIdx > endIdx && (todayIdx >= startIdx || todayIdx <= endIdx))
        ) {
            todayHours = { open: openTime, close: closeTime };
            break;
        }
    }

    // 단일 요일 매칭
    if (!todayHours) {
        dayRangePattern.lastIndex = 0;
        while ((match = singleDayPattern.exec(openingHours)) !== null) {
            const day = match[1];
            if (day === todayName) {
                todayHours = {
                    open: `${match[2].padStart(2, "0")}:${match[3]}`,
                    close: `${match[4].padStart(2, "0")}:${match[5]}`,
                };
                break;
            }
        }
    }

    // "매일" 형식 처리
    if (!todayHours) {
        const everydayPattern = /매일\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/;
        const everydayMatch = openingHours.match(everydayPattern);
        if (everydayMatch) {
            todayHours = {
                open: `${everydayMatch[1].padStart(2, "0")}:${everydayMatch[2]}`,
                close: `${everydayMatch[3].padStart(2, "0")}:${everydayMatch[4]}`,
            };
        }
    }

    return {
        todayHours,
        allHours: openingHours,
    };
}
/**
 * 시간 문자열을 분으로 변환 (예: "09:30" -> 570)
 */
function timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * 현재 시간이 영업 시간 내인지 확인
 */
function isWithinBusinessHours(openTime: string, closeTime: string): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = timeToMinutes(openTime);
    const closeMinutes = timeToMinutes(closeTime);

    // 자정을 넘어가는 경우 처리 (예: 22:00-02:00)
    if (closeMinutes < openMinutes) {
        return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    }

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * 마감까지 남은 시간 계산 (분 단위)
 */
function getMinutesUntilClose(closeTime: string): number {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const closeMinutes = timeToMinutes(closeTime);

    // 자정을 넘어가는 경우 처리
    if (closeMinutes < currentMinutes) {
        return 24 * 60 - currentMinutes + closeMinutes;
    }

    return closeMinutes - currentMinutes;
}

/**
 * 장소의 현재 영업 상태를 계산
 */
export function getPlaceStatus(
    openingHours: string | null | undefined,
    closedDays: PlaceClosedDay[] = []
): PlaceStatusInfo {
    // 휴무일 확인
    if (isClosedToday(closedDays)) {
        return {
            status: "휴무",
            message: "오늘은 휴무일입니다",
            isOpen: false,
        };
    }

    // 영업시간 정보가 없는 경우
    if (!openingHours) {
        return {
            status: "정보 없음",
            message: "영업시간 정보가 없습니다",
            isOpen: false,
        };
    }

    // 영업시간 파싱
    const { todayHours, allHours } = parseOpeningHours(openingHours);

    if (!todayHours) {
        return {
            status: "정보 없음",
            message: allHours || "영업시간 정보가 없습니다",
            isOpen: false,
        };
    }

    const { open, close } = todayHours;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = timeToMinutes(open);
    const closeMinutes = timeToMinutes(close);

    // 영업 시간 내인지 확인
    const isOpen = isWithinBusinessHours(open, close);

    if (isOpen) {
        const minutesUntilClose = getMinutesUntilClose(close);

        // 마감 1시간 이내면 "곧 마감"
        if (minutesUntilClose <= 60) {
            return {
                status: "곧 마감",
                message: `${close} 마감 (약 ${Math.ceil(minutesUntilClose / 10) * 10}분 후)`,
                isOpen: true,
            };
        }

        return {
            status: "영업중",
            message: `${open} - ${close} 영업중`,
            isOpen: true,
        };
    } else {
        // 영업 종료 또는 아직 영업 시작 전
        if (currentMinutes < openMinutes) {
            // 아직 영업 시작 전
            return {
                status: "영업종료",
                message: `${open}에 영업 시작`,
                isOpen: false,
                nextOpenTime: open,
            };
        } else {
            // 영업 종료
            return {
                status: "영업종료",
                message: `${close}에 영업 종료`,
                isOpen: false,
            };
        }
    }
}
