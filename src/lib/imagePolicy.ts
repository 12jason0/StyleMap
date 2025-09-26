// src/lib/imagePolicy.ts

import { Course, CoursePlace, Place } from "@prisma/client";

export type ImagePolicy = "any" | "all" | "none" | "all-or-one-missing" | "none-or-all";

export type CourseWithPlaces = Course & {
    coursePlaces?: (CoursePlace & {
        place?: Place;
    })[];
};

function courseHasAllImages(course: Partial<CourseWithPlaces>): boolean {
    if (!course.imageUrl) return false;
    const places = course.coursePlaces || [];
    if (places.length === 0) return true;
    return places.every((cp) => cp.place?.imageUrl);
}

function courseHasNoImages(course: Partial<CourseWithPlaces>): boolean {
    if (course.imageUrl) return false;
    const places = course.coursePlaces || [];
    if (places.length === 0) return true;
    return places.every((cp) => !cp.place?.imageUrl);
}

function courseHasOneMissing(course: Partial<CourseWithPlaces>): boolean {
    if (!course.imageUrl) return true;
    const places = course.coursePlaces || [];
    if (places.length === 0) return false;
    return places.some((cp) => !cp.place?.imageUrl);
}

// ✅ [수정됨] 타입을 Partial<CourseWithPlaces>[] 로 변경하여 lean 쿼리 결과도 받을 수 있게 합니다.
export function filterCoursesByImagePolicy(
    courses: Partial<CourseWithPlaces>[],
    policy?: ImagePolicy
): Partial<CourseWithPlaces>[] {
    if (!policy || policy === "any") {
        return courses;
    }

    return courses.filter((course) => {
        switch (policy) {
            case "all":
                return courseHasAllImages(course);
            case "none":
                return courseHasNoImages(course);
            case "all-or-one-missing":
                return courseHasAllImages(course) || courseHasOneMissing(course);
            case "none-or-all":
                return courseHasNoImages(course) || courseHasAllImages(course);
            default:
                return true;
        }
    });
}
