export type ImagePolicy = "none-or-all" | "all-or-one-missing" | null | undefined;

type CourseWithPlaces = {
    course_places?: Array<{ places?: { imageUrl?: string | null } | null }> | null; // 덤프/스키마 기준 관계명: places
};

export function filterCoursesByImagePolicy<T extends CourseWithPlaces>(courses: T[], policy: ImagePolicy): T[] {
    if (!policy) return courses;
    return courses.filter((course) => {
        const cps = course.course_places || [];
        const total = cps.length;
        if (policy === "none-or-all") {
            if (total === 0) return true;
            const images = cps.filter((cp) => !!cp?.places?.imageUrl).length;
            return images === 0 || images === total;
        }
        if (policy === "all-or-one-missing") {
            if (total === 0) return false;
            const images = cps.filter((cp) => !!cp?.places?.imageUrl).length;
            return images === total || images === total - 1;
        }
        return true;
    });
}
