import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * DoNa 추천 알고리즘 점수 계산 공식 (Rule-based Scoring)
 *
 * 총점 = (취향 매칭 × 0.35) + (상황/목적 매칭 × 0.25) + (시간대 매칭 × 0.15)
 *      + (예산 매칭 × 0.15) + (특수 태그 매칭 × 0.10)
 *
 * 각 점수는 0~1 사이로 정규화됨
 */
function calculateTagMatchScore(
    courseTags: any,
    userPrefs: {
        companionType?: string;
        vibe?: string;
        budgetRange?: string;
        specialDateType?: string;
    }
): number {
    if (!courseTags || typeof courseTags !== "object") return 0;

    // 1. 취향 매칭 점수 (0~1) × 0.35
    const preferenceScore = calculatePreferenceScore(courseTags, userPrefs);

    // 2. 상황/목적 매칭 점수 (0~1) × 0.25
    const situationScore = calculateSituationScore(courseTags, userPrefs);

    // 3. 시간대 매칭 점수 (0~1) × 0.15
    const timeScore = calculateTimeScore(courseTags, userPrefs);

    // 4. 예산 매칭 점수 (0~1) × 0.15
    const budgetScore = calculateBudgetScore(courseTags, userPrefs);

    // 5. 특수 태그 매칭 점수 (0~1) × 0.10
    const themeScore = calculateThemeScore(courseTags, userPrefs);

    // 최종 점수 계산 (0~1 사이)
    const totalScore =
        preferenceScore * 0.35 + situationScore * 0.25 + timeScore * 0.15 + budgetScore * 0.15 + themeScore * 0.1;

    return totalScore;
}

/**
 * 1. 취향 매칭 점수 (0~1)
 * concept 태그와 사용자 vibe 매칭
 */
function calculatePreferenceScore(courseTags: any, userPrefs: any): number {
    if (!courseTags.concept || !Array.isArray(courseTags.concept) || !userPrefs.vibe) {
        return 0;
    }

    const vibeMap: Record<string, string[]> = {
        romantic: ["로맨틱", "감성", "분위기", "데이트"],
        calm: ["조용한", "잔잔한", "힐링", "감성"],
        hip: ["트렌디한", "핫플", "인스타", "사진맛집"],
        private: ["프라이빗", "조용한"],
        active: ["액티브", "활동적인", "모험"],
    };

    const mappedTags = vibeMap[userPrefs.vibe] || [];
    const courseConcepts = courseTags.concept as string[];

    // 일치하는 취향 태그 수 계산
    const matchedCount = courseConcepts.filter((concept) =>
        mappedTags.some((mapped) => concept.includes(mapped) || mapped.includes(concept))
    ).length;

    // 전체 취향 태그 수
    const totalCount = courseConcepts.length;

    if (totalCount === 0) return 0;

    // 일치율 반환 (0~1)
    return matchedCount / totalCount;
}

/**
 * 2. 상황/목적 매칭 점수 (0~1)
 * target 태그와 companionType, specialDateType 매칭
 * 특수 목적 태그는 추가 가중치 +0.05
 */
function calculateSituationScore(courseTags: any, userPrefs: any): number {
    if (!courseTags.target || !Array.isArray(courseTags.target)) {
        return 0;
    }

    const targetTags = courseTags.target as string[];
    const matchedTags: string[] = [];

    // companionType 매칭
    if (userPrefs.companionType) {
        const companionMap: Record<string, string[]> = {
            solo: ["혼자", "솔로"],
            couple: ["커플", "연인", "데이트"],
            friends: ["친구", "소그룹"],
            family: ["가족"],
            blinddate: ["소개팅"],
        };
        const mappedTags = companionMap[userPrefs.companionType] || [];
        targetTags.forEach((tag) => {
            if (mappedTags.some((m) => tag.includes(m) || m.includes(tag))) {
                matchedTags.push(tag);
            }
        });
    }

    // specialDateType 매칭 (특수 목적 태그)
    let hasSpecialPurpose = false;
    if (userPrefs.specialDateType) {
        const specialDateMap: Record<string, string[]> = {
            "100-200days": ["100일", "백일", "200일", "이백일"],
            anniversary: ["1주년", "2주년", "기념일", "애니버서리"],
            proposal: ["프로포즈", "청혼"],
            birthday: ["생일", "생신"],
            other: ["기타"],
        };
        const mappedTags = specialDateMap[userPrefs.specialDateType] || [];
        targetTags.forEach((tag) => {
            if (mappedTags.some((m) => tag.includes(m) || m.includes(tag))) {
                matchedTags.push(tag);
                // 특수 목적 태그 확인
                if (
                    ["100일", "백일", "200일", "이백일", "여자친구생일", "소개팅", "첫 데이트"].some((sp) =>
                        tag.includes(sp)
                    )
                ) {
                    hasSpecialPurpose = true;
                }
            }
        });
    }

    if (targetTags.length === 0) return 0;

    // 일치율 계산
    const matchRatio = matchedTags.length / targetTags.length;

    // 특수 목적 태그가 있으면 추가 가중치 (최대 1.0을 넘지 않도록)
    const finalScore = Math.min(matchRatio + (hasSpecialPurpose ? 0.05 : 0), 1.0);

    return finalScore;
}

/**
 * 3. 시간대 매칭 점수 (0~1)
 * 하나라도 매칭되면 1점, 전혀 없으면 0점
 */
function calculateTimeScore(courseTags: any, userPrefs: any): number {
    // 현재는 사용자 선호도에 time 정보가 없으므로, 코스에 time 태그가 있으면 기본 점수 부여
    // 추후 사용자 선호도에 time 정보가 추가되면 매칭 로직 구현
    if (courseTags.time && Array.isArray(courseTags.time) && courseTags.time.length > 0) {
        return 1.0; // 시간대 정보가 있으면 1점
    }
    return 0;
}

/**
 * 4. 예산 매칭 점수 (0~1)
 * 예산이 정확히 일치하면 1점, 아니면 0점
 */
function calculateBudgetScore(courseTags: any, userPrefs: any): number {
    if (!courseTags.budget || !userPrefs.budgetRange) {
        return 0;
    }

    return courseTags.budget === userPrefs.budgetRange ? 1.0 : 0;
}

/**
 * 5. 특수 태그 매칭 점수 (0~1)
 * theme 태그 매칭률
 */
function calculateThemeScore(courseTags: any, userPrefs: any): number {
    // 현재는 사용자 선호도에 theme 정보가 없으므로, 코스에 theme 태그가 있으면 기본 점수 부여
    // 추후 사용자 선호도에 theme 정보가 추가되면 매칭 로직 구현
    if (courseTags.theme && Array.isArray(courseTags.theme) && courseTags.theme.length > 0) {
        return 0.5; // 테마 정보가 있으면 기본 점수 0.5
    }
    return 0;
}

/**
 * 새로운 추천 알고리즘: conceptMatch * 0.25 + moodMatch * 0.25 + regionMatch * 0.20 + goalMatch * 0.30
 */
function calculateNewRecommendationScore(
    courseTags: any,
    courseRegion: string | null,
    longTermPrefs: { concept?: string[]; companion?: string; mood?: string[]; regions?: string[] },
    todayContext: { goal?: string; companion_today?: string; mood_today?: string; region_today?: string }
): number {
    let score = 0;

    // 1. conceptMatch (0~1) × 0.25
    const conceptScore = calculateConceptMatch(courseTags, longTermPrefs.concept || [], todayContext.goal || "");
    score += conceptScore * 0.25;

    // 2. moodMatch (0~1) × 0.25
    const moodScore = calculateMoodMatch(courseTags, longTermPrefs.mood || [], todayContext.mood_today || "");
    score += moodScore * 0.25;

    // 3. regionMatch (0~1) × 0.20
    const regionScore = calculateRegionMatch(
        courseRegion,
        longTermPrefs.regions || [],
        todayContext.region_today || ""
    );
    score += regionScore * 0.2;

    // 4. goalMatch (0~1) × 0.30
    const goalScore = calculateGoalMatch(courseTags, todayContext.goal || "", todayContext.companion_today || "");
    score += goalScore * 0.3;

    return Math.min(score, 1.0);
}

function calculateConceptMatch(courseTags: any, longTermConcepts: string[], goal: string): number {
    if (!courseTags || !courseTags.concept || !Array.isArray(courseTags.concept)) return 0;

    const courseConcepts = courseTags.concept as string[];
    let matchCount = 0;

    // 장기 선호도 매칭
    longTermConcepts.forEach((pref) => {
        if (courseConcepts.some((c) => c.includes(pref) || pref.includes(c))) {
            matchCount++;
        }
    });

    // 목적 기반 매칭
    const goalConceptMap: Record<string, string[]> = {
        기념일: ["프리미엄", "특별한", "로맨틱"],
        데이트: ["로맨틱", "감성", "데이트"],
        "썸·소개팅": ["조용한", "프라이빗", "카페"],
        힐링: ["힐링", "감성", "조용한"],
        "특별한 이벤트": ["프리미엄", "특별한"],
        "사진 잘 나오는 코스": ["인생샷", "사진", "인스타"],
        "밤 데이트": ["야경", "밤", "로맨틱"],
    };

    const goalConcepts = goalConceptMap[goal] || [];
    goalConcepts.forEach((gc) => {
        if (courseConcepts.some((c) => c.includes(gc) || gc.includes(c))) {
            matchCount++;
        }
    });

    const totalPossible = Math.max(longTermConcepts.length + goalConcepts.length, 1);
    return Math.min(matchCount / totalPossible, 1.0);
}

function calculateMoodMatch(courseTags: any, longTermMoods: string[], moodToday: string): number {
    if (!courseTags || !courseTags.mood || !Array.isArray(courseTags.mood)) return 0;

    const courseMoods = courseTags.mood as string[];
    let matchCount = 0;

    // 장기 선호도 매칭
    longTermMoods.forEach((pref) => {
        if (courseMoods.some((m) => m.includes(pref) || pref.includes(m))) {
            matchCount++;
        }
    });

    // 오늘 분위기 매칭
    const moodMap: Record<string, string[]> = {
        조용한: ["조용한", "프라이빗"],
        "감성 가득한": ["감성", "로맨틱"],
        트렌디한: ["트렌디한", "핫플"],
        활동적인: ["활동적인", "액티브"],
        프리미엄: ["프리미엄", "럭셔리"],
        "사진 잘 나오는": ["인스타", "사진"],
        여유로운: ["여유로운", "힐링"],
    };

    const todayMoods = moodMap[moodToday] || [];
    todayMoods.forEach((tm) => {
        if (courseMoods.some((m) => m.includes(tm) || tm.includes(m))) {
            matchCount++;
        }
    });

    const totalPossible = Math.max(longTermMoods.length + todayMoods.length, 1);
    return Math.min(matchCount / totalPossible, 1.0);
}

function calculateRegionMatch(courseRegion: string | null, longTermRegions: string[], regionToday: string): number {
    if (!courseRegion) return 0;

    // 오늘 선택한 지역이 있으면 정확한 매칭 우선
    if (regionToday) {
        // 정확한 매칭 (가장 높은 점수)
        if (courseRegion === regionToday || courseRegion.includes(regionToday) || regionToday.includes(courseRegion)) {
            // 정확히 일치하면 1.0, 부분 일치하면 0.8
            return courseRegion === regionToday || courseRegion.includes(regionToday) ? 1.0 : 0.8;
        }
        // 오늘 선택한 지역과 일치하지 않으면 0점 (다른 지역은 추천하지 않음)
        return 0;
    }

    // 오늘 선택한 지역이 없으면 장기 선호 지역으로 매칭
    if (longTermRegions.length > 0) {
        // 정확한 매칭 우선
        const exactMatch = longTermRegions.some((r) => courseRegion === r || courseRegion.includes(r));
        if (exactMatch) return 1.0;

        // 부분 매칭
        const partialMatch = longTermRegions.some((r) => r.includes(courseRegion));
        if (partialMatch) return 0.6;
    }

    // 장기 선호 지역도 없으면 기본 점수
    return 0.3;
}

function calculateGoalMatch(courseTags: any, goal: string, companionToday: string): number {
    if (!goal) return 0;

    let score = 0;

    // 목적 기반 가중치
    const goalWeights: Record<string, number> = {
        기념일: 1.0,
        데이트: 0.9,
        "썸·소개팅": 0.8,
        힐링: 0.7,
        "특별한 이벤트": 1.0,
        "사진 잘 나오는 코스": 0.8,
        "밤 데이트": 0.9,
    };

    const baseWeight = goalWeights[goal] || 0.5;

    // 코스 태그와 목적 매칭
    if (courseTags) {
        const targetTags = courseTags.target || [];
        const conceptTags = courseTags.concept || [];

        // 동반자 매칭
        const companionMap: Record<string, string[]> = {
            연인: ["연인", "커플", "데이트"],
            "썸 상대": ["썸", "데이트"],
            "소개팅 상대": ["소개팅", "첫 만남"],
            친구: ["친구", "소그룹"],
            혼자: ["혼자", "솔로"],
        };

        const companionTags = companionMap[companionToday] || [];
        const hasCompanionMatch = companionTags.some((ct) =>
            targetTags.some((tt: string) => tt.includes(ct) || ct.includes(tt))
        );

        if (hasCompanionMatch) {
            score += 0.5;
        }

        // 목적 매칭
        const goalTags: Record<string, string[]> = {
            기념일: ["기념일", "특별한", "프리미엄"],
            데이트: ["데이트", "로맨틱"],
            "썸·소개팅": ["소개팅", "첫 만남"],
            힐링: ["힐링", "감성"],
            "특별한 이벤트": ["특별한", "이벤트"],
            "사진 잘 나오는 코스": ["인생샷", "사진", "인스타"],
            "밤 데이트": ["야경", "밤"],
        };

        const goalTagList = goalTags[goal] || [];
        const hasGoalMatch = goalTagList.some((gt) =>
            [...targetTags, ...conceptTags].some((tag: string) => tag.includes(gt) || gt.includes(tag))
        );

        if (hasGoalMatch) {
            score += 0.5;
        }
    }

    return Math.min(score * baseWeight, 1.0);
}

export async function GET(req: NextRequest) {
    try {
        const userIdStr = getUserIdFromRequest(req);
        const { searchParams } = new URL(req.url);
        const limit = Math.min(Math.max(Number(searchParams.get("limit") || 6), 1), 24);

        // 오늘의 상황 파라미터
        const goal = searchParams.get("goal") || "";
        const companionToday = searchParams.get("companion_today") || "";
        const moodToday = searchParams.get("mood_today") || "";
        const regionToday = searchParams.get("region_today") || "";

        if (!userIdStr) {
            // 비로그인: 인기 코스 반환
            const popular = await prisma.course.findMany({ orderBy: { view_count: "desc" }, take: limit });
            return NextResponse.json({ recommendations: popular });
        }
        const userId = Number(userIdStr);

        // 사용자 장기 선호도 가져오기 (온보딩에서 설정)
        const userPrefs = await prisma.userPreference.findUnique({
            where: { userId },
            select: { preferences: true },
        });

        // 최근 상호작용 10개 추출
        const recent = await prisma.userInteraction.findMany({
            where: { userId, action: { in: ["view", "click", "like"] } },
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { course: { select: { id: true, concept: true, region: true } } },
        });

        // 모든 코스 가져오기
        const allCourses = (await prisma.course.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                region: true,
                concept: true,
                rating: true,
                view_count: true,
                createdAt: true,
            },
        })) as Array<{
            id: number;
            title: string;
            description: string | null;
            imageUrl: string | null;
            region: string | null;
            concept: string | null;
            rating: number;
            view_count: number;
            createdAt: Date;
            tags?: any;
        }>;

        // 각 코스의 tags 가져오기
        const coursesWithTags = await Promise.all(
            allCourses.map(async (course) => {
                const fullCourse = await prisma.course.findUnique({
                    where: { id: course.id },
                    select: { tags: true } as any,
                });
                return { ...course, tags: (fullCourse as any)?.tags };
            })
        );

        // 사용자 장기 선호도 파싱
        let longTermPrefs: any = {};
        if (userPrefs?.preferences && typeof userPrefs.preferences === "object") {
            longTermPrefs = userPrefs.preferences as {
                concept?: string[];
                companion?: string;
                mood?: string[];
                regions?: string[];
            };
        }

        // 오늘의 상황
        const todayContext = {
            goal,
            companion_today: companionToday,
            mood_today: moodToday,
            region_today: regionToday,
        };

        // 오늘 선택한 지역이 있으면 해당 지역의 코스만 필터링 (선택적)
        let filteredCourses = coursesWithTags;
        if (regionToday) {
            // 지역이 정확히 일치하거나 포함하는 코스만 필터링
            filteredCourses = coursesWithTags.filter((course) => {
                if (!course.region) return false;
                return (
                    course.region === regionToday ||
                    course.region.includes(regionToday) ||
                    regionToday.includes(course.region)
                );
            });

            // 필터링 후 결과가 없으면 전체 코스 사용 (폴백)
            if (filteredCourses.length === 0) {
                filteredCourses = coursesWithTags;
            }
        }

        // 새로운 알고리즘으로 점수 계산
        const coursesWithScores = filteredCourses.map((course) => {
            const recommendationScore = calculateNewRecommendationScore(
                course.tags,
                course.region,
                longTermPrefs,
                todayContext
            );

            // 보너스 점수 (최대 0.2)
            let bonusScore = 0;

            // 최근 상호작용 보너스
            if (recent && recent.length > 0) {
                const concepts = recent.map((r) => r.course?.concept).filter(Boolean) as string[];
                const regions = recent.map((r) => r.course?.region).filter(Boolean) as string[];

                const topConcept = concepts
                    .slice()
                    .sort((a, b) => concepts.filter((x) => x === a).length - concepts.filter((x) => x === b).length)
                    .pop();

                const topRegion = regions
                    .slice()
                    .sort((a, b) => regions.filter((x) => x === a).length - regions.filter((x) => x === b).length)
                    .pop();

                if (topConcept && course.concept === topConcept) {
                    bonusScore += 0.1;
                }
                if (topRegion && course.region === topRegion) {
                    bonusScore += 0.1;
                }
            }

            // 인기도 보너스
            const normalizedViewScore = Math.min(Math.log10(course.view_count + 1) / 5, 0.05);
            bonusScore += normalizedViewScore;

            // 평점 보너스
            const normalizedRatingScore = Math.min((course.rating / 5) * 0.05, 0.05);
            bonusScore += normalizedRatingScore;

            bonusScore = Math.min(bonusScore, 0.2);

            const finalScore = Math.min(recommendationScore + bonusScore, 1.0);

            return { ...course, matchScore: finalScore };
        });

        // 점수 순으로 정렬하고 상위 N개 선택
        const recs = coursesWithScores
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, limit)
            .map(({ matchScore, ...course }) => course);

        // 결과가 없으면 인기 코스 반환
        if (recs.length === 0) {
            const popular = await prisma.course.findMany({ orderBy: { view_count: "desc" }, take: limit });
            return NextResponse.json({ recommendations: popular });
        }

        return NextResponse.json({ recommendations: recs });
    } catch (e) {
        console.error("Recommendation error:", e);
        return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 });
    }
}
