-- DropForeignKey
ALTER TABLE "public"."_CourseTagToCourses" DROP CONSTRAINT "_CourseTagToCourses_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_CourseTagToCourses" DROP CONSTRAINT "_CourseTagToCourses_B_fkey";

-- DropTable (guarded for shadow DBs)
DROP TABLE IF EXISTS "public"."_CourseTagToCourses_Backup";

-- AddForeignKey
ALTER TABLE "public"."_CourseTagToCourses" ADD CONSTRAINT "_CourseTagToCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CourseTagToCourses" ADD CONSTRAINT "_CourseTagToCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."course_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
