export type ImagePolicy = "none-or-all" | "all-or-one-missing" | null | undefined;

type CourseWithPlaces = {
    course_places?: Array<{ place?: { imageUrl?: string | null } | null }> | null; // [수정] places -> place
};

export function filterCoursesByImagePolicy<T extends CourseWithPlaces>(courses: T[], policy: ImagePolicy): T[] {
    if (!policy) return courses;
    return courses.filter((course) => {
        const cps = course.course_places || [];
        const total = cps.length;
        if (policy === "none-or-all") {
            if (total === 0) return true;
            const images = cps.filter((cp) => !!cp?.place?.imageUrl).length; // [수정] cp?.places -> cp?.place
            return images === 0 || images === total;
        }
        if (policy === "all-or-one-missing") {
            if (total === 0) return false;
            const images = cps.filter((cp) => !!cp?.place?.imageUrl).length; // [수정] cp?.places -> cp?.place
            return images === total || images === total - 1;
        }
        return true;
    });
}
