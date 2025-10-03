// src/lib/imagePolicy.ts

import type { Course, CoursePlace, Place } from "@prisma/client";

export type ImagePolicy = "any" | "all" | "none" | "all-or-one-missing" | "none-or-all";

export type CourseWithPlaces = Course & {
    coursePlaces?: (CoursePlace & {
        place?: Place;
    })[];
};

function courseHasAllImages(course: Partial<CourseWithPlaces>): boolean {
    if (!course.imageUrl) return false;
    const places = Array.isArray(course.coursePlaces) ? course.coursePlaces : [];
    if (places.length === 0) return true;
    return places.every((cp) => !!cp.place?.imageUrl);
}

function courseHasNoImages(course: Partial<CourseWithPlaces>): boolean {
    if (course.imageUrl) return false;
    const places = Array.isArray(course.coursePlaces) ? course.coursePlaces : [];
    if (places.length === 0) return true;
    return places.every((cp) => !cp.place?.imageUrl);
}

function courseHasOneMissing(course: Partial<CourseWithPlaces>): boolean {
    if (!course.imageUrl) return true;
    const places = Array.isArray(course.coursePlaces) ? course.coursePlaces : [];
    if (places.length === 0) return false;
    return places.some((cp) => !cp.place?.imageUrl);
}

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
                console.warn("[WARN] Unknown imagePolicy:", policy);
                return true; // 알 수 없는 정책이면 필터링하지 않음
        }
    });
}
