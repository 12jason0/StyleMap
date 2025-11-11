import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

// DB 열기
const getDB = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync("dona.db");
    }
    return db;
};

// DB 초기화
export const initDB = async () => {
    const database = await getDB();

    // 코스 테이블
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            title TEXT,
            subtitle TEXT,
            description TEXT,
            image TEXT,
            category TEXT,
            difficulty TEXT,
            duration TEXT,
            likes INTEGER,
            isCompleted INTEGER,
            data TEXT,
            createdAt TEXT
        )
    `);

    // 장소 테이블
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS places (
            id TEXT PRIMARY KEY,
            courseId TEXT,
            name TEXT,
            address TEXT,
            latitude REAL,
            longitude REAL,
            order_num INTEGER,
            data TEXT
        )
    `);

    // 사용자가 저장한 코스
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS saved_courses (
            courseId TEXT PRIMARY KEY,
            savedAt TEXT
        )
    `);
};

// 코스 저장
export const saveCourses = async (courses: any[]) => {
    const database = await getDB();

    for (const course of courses) {
        await database.runAsync(
            `INSERT OR REPLACE INTO courses 
            (id, title, subtitle, description, image, category, difficulty, duration, likes, isCompleted, data, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                course.id,
                course.title || "",
                course.subtitle || "",
                course.description || "",
                course.image || "",
                course.category || "",
                course.difficulty || "",
                course.duration || "",
                course.likes || 0,
                course.isCompleted ? 1 : 0,
                JSON.stringify(course),
                new Date().toISOString(),
            ]
        );
    }
};

// 코스 불러오기
export const loadCourses = async (): Promise<any[]> => {
    const database = await getDB();
    const rows = await database.getAllAsync("SELECT * FROM courses ORDER BY createdAt DESC");

    return rows.map((row: any) => ({
        ...JSON.parse(row.data),
        isCompleted: row.isCompleted === 1,
    }));
};

// 특정 코스 가져오기
export const getCourse = async (courseId: string): Promise<any> => {
    const database = await getDB();
    const row = await database.getFirstAsync("SELECT * FROM courses WHERE id = ?", [courseId]);

    if (row) {
        return JSON.parse((row as any).data);
    }
    return null;
};

// 코스 저장/북마크
export const toggleSaveCourse = async (courseId: string, saved: boolean) => {
    const database = await getDB();

    if (saved) {
        await database.runAsync("INSERT OR REPLACE INTO saved_courses (courseId, savedAt) VALUES (?, ?)", [
            courseId,
            new Date().toISOString(),
        ]);
    } else {
        await database.runAsync("DELETE FROM saved_courses WHERE courseId = ?", [courseId]);
    }
};

// 저장된 코스 목록
export const getSavedCourses = async (): Promise<any[]> => {
    const database = await getDB();
    const rows = await database.getAllAsync(`
        SELECT c.* FROM courses c 
        INNER JOIN saved_courses s ON c.id = s.courseId 
        ORDER BY s.savedAt DESC
    `);

    return rows.map((row: any) => JSON.parse(row.data));
};

// 코스 검색
export const searchCourses = async (keyword: string): Promise<any[]> => {
    const database = await getDB();
    const rows = await database.getAllAsync(
        `SELECT * FROM courses 
         WHERE title LIKE ? OR description LIKE ? OR category LIKE ?
         ORDER BY createdAt DESC`,
        [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
    );

    return rows.map((row: any) => JSON.parse(row.data));
};
