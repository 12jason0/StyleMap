-- CreateEnum
CREATE TYPE "public"."ChapterType" AS ENUM ('intro', 'restaurant', 'cafe', 'spot', 'final_spot', 'ending');

-- CreateEnum
CREATE TYPE "public"."MissionType" AS ENUM ('quiz', 'photo', 'gps', 'puzzle', 'text', 'choice');

-- CreateEnum
CREATE TYPE "public"."RewardType" AS ENUM ('signup', 'checkin', 'ad_watch', 'purchase', 'event');

-- CreateEnum
CREATE TYPE "public"."RewardUnit" AS ENUM ('coin', 'coupon', 'water');

-- CreateEnum
CREATE TYPE "public"."SpeakerRole" AS ENUM ('user', 'npc', 'system');

-- CreateEnum
CREATE TYPE "public"."TreeStatus" AS ENUM ('seedling', 'growing', 'completed');

-- CreateEnum
CREATE TYPE "public"."WaterSource" AS ENUM ('course', 'escape', 'admin', 'bonus');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(191),
    "password" VARCHAR(255),
    "nickname" VARCHAR(50) NOT NULL,
    "profileImageUrl" TEXT,
    "socialId" VARCHAR(255),
    "provider" VARCHAR(20) NOT NULL DEFAULT 'local',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mbti" VARCHAR(20),
    "age" INTEGER,
    "coinBalance" INTEGER NOT NULL DEFAULT 0,
    "couponCount" INTEGER NOT NULL DEFAULT 0,
    "gender" VARCHAR(10),
    "lastActiveAt" TIMESTAMP(3),
    "level" INTEGER NOT NULL DEFAULT 1,
    "location" VARCHAR(100),
    "preferredTags" TEXT[],
    "totalWaterGiven" INTEGER NOT NULL DEFAULT 0,
    "waterStock" INTEGER NOT NULL DEFAULT 0,
    "ageRange" VARCHAR(20),
    "birthday" TIMESTAMP(3),
    "phone" VARCHAR(30),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_rewards" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "type" "public"."RewardType" NOT NULL,
    "unit" "public"."RewardUnit" NOT NULL,

    CONSTRAINT "user_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_checkins" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rewarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "user_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_interactions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "preferences" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."push_tokens" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'expo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "imageUrl" VARCHAR(255),
    "region" VARCHAR(50),
    "duration" VARCHAR(45),
    "concept" VARCHAR(45),
    "tags" JSONB,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "current_participants" INTEGER NOT NULL DEFAULT 0,
    "max_participants" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."places" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(500),
    "description" TEXT,
    "category" VARCHAR(100),
    "avg_cost_range" VARCHAR(100),
    "opening_hours" VARCHAR(200),
    "phone" VARCHAR(50),
    "website" VARCHAR(500),
    "parking_available" BOOLEAN DEFAULT false,
    "reservation_required" BOOLEAN DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "imageUrl" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tags" TEXT,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_tags" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stories" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "synopsis" TEXT,
    "region" VARCHAR(100),
    "estimated_duration_min" INTEGER,
    "price" VARCHAR(100),
    "reward_badge_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,
    "level" INTEGER DEFAULT 1,
    "epilogue_text" TEXT,
    "stationName" VARCHAR(100),
    "stationLat" DOUBLE PRECISION,
    "stationLng" DOUBLE PRECISION,
    "scenario" TEXT,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlaceOption" (
    "id" SERIAL NOT NULL,
    "storyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "signature" TEXT,

    CONSTRAINT "PlaceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlaceDialogue" (
    "id" SERIAL NOT NULL,
    "storyId" INTEGER NOT NULL,
    "placeId" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT NOT NULL DEFAULT 'main',
    "speaker" TEXT,
    "message" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLetter" BOOLEAN NOT NULL DEFAULT false,
    "letterIndex" INTEGER,
    "role" "public"."SpeakerRole" NOT NULL DEFAULT 'npc',

    CONSTRAINT "PlaceDialogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlaceMission" (
    "id" SERIAL NOT NULL,
    "placeId" INTEGER NOT NULL,
    "missionNumber" INTEGER NOT NULL,
    "missionPayload" JSONB,
    "description" TEXT,
    "answer" TEXT,
    "hint" TEXT,
    "question" TEXT,
    "missionType" "public"."MissionType" NOT NULL,

    CONSTRAINT "PlaceMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlaceStory" (
    "id" SERIAL NOT NULL,
    "placeId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "speaker" TEXT,
    "dialogue" TEXT,
    "narration" TEXT,
    "nextTrigger" TEXT,

    CONSTRAINT "PlaceStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_collages" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "templateId" INTEGER,
    "collage_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "storyId" INTEGER,

    CONSTRAINT "user_collages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."collage_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "image_url" TEXT,
    "frames_json" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storyId" INTEGER,

    CONSTRAINT "collage_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."badges" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompletedCourses" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedCourses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "course_title" VARCHAR(255) NOT NULL,
    "booking_date" DATE NOT NULL,
    "status" VARCHAR(45) NOT NULL,
    "price" VARCHAR(50) NOT NULL,
    "participants" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "course_id" INTEGER NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_favorites" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_places" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "place_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "estimated_duration" INTEGER,
    "recommended_time" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."place_closed_days" (
    "id" SERIAL NOT NULL,
    "place_id" INTEGER NOT NULL,
    "day_of_week" INTEGER,
    "specific_date" DATE,
    "note" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_closed_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."highlights" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."benefits" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "benefit_text" TEXT NOT NULL,
    "category" VARCHAR(100),
    "display_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_notices" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "notice_text" TEXT NOT NULL,
    "type" VARCHAR(100) DEFAULT 'info',
    "display_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."userstoryprogress" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "story_id" INTEGER NOT NULL,
    "current_chapter" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "userstoryprogress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mission_submissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "photo_url" TEXT,
    "text_answer" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_badges" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "badge_id" INTEGER NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompletedEscapes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "storyId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedEscapes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_CourseTagToCourses" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CourseTagToCourses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."trees" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(100),
    "variant" VARCHAR(50),
    "waterCount" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."TreeStatus" NOT NULL DEFAULT 'seedling',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."water_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "treeId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "public"."WaterSource" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gardens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(100),
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gardens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."garden_trees" (
    "id" SERIAL NOT NULL,
    "gardenId" INTEGER NOT NULL,
    "treeId" INTEGER,
    "posX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garden_trees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_provider_socialId_idx" ON "public"."users"("provider", "socialId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "public"."user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_userId_key" ON "public"."push_tokens"("userId");

-- CreateIndex
CREATE INDEX "push_tokens_userId_idx" ON "public"."push_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "course_tags_name_key" ON "public"."course_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "public"."badges"("name");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_course" ON "public"."user_favorites"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "place_closed_days_place_id_idx" ON "public"."place_closed_days"("place_id");

-- CreateIndex
CREATE INDEX "place_closed_days_day_of_week_idx" ON "public"."place_closed_days"("day_of_week");

-- CreateIndex
CREATE INDEX "place_closed_days_specific_date_idx" ON "public"."place_closed_days"("specific_date");

-- CreateIndex
CREATE UNIQUE INDEX "userstoryprogress_user_id_story_id_key" ON "public"."userstoryprogress"("user_id", "story_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "public"."user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "_CourseTagToCourses_B_index" ON "public"."_CourseTagToCourses"("B");

-- CreateIndex
CREATE INDEX "trees_userId_idx" ON "public"."trees"("userId");

-- CreateIndex
CREATE INDEX "water_logs_userId_idx" ON "public"."water_logs"("userId");

-- CreateIndex
CREATE INDEX "water_logs_treeId_idx" ON "public"."water_logs"("treeId");

-- CreateIndex
CREATE UNIQUE INDEX "gardens_userId_key" ON "public"."gardens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "garden_trees_treeId_key" ON "public"."garden_trees"("treeId");

-- CreateIndex
CREATE INDEX "garden_trees_gardenId_idx" ON "public"."garden_trees"("gardenId");

-- AddForeignKey
ALTER TABLE "public"."user_rewards" ADD CONSTRAINT "user_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_checkins" ADD CONSTRAINT "user_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_interactions" ADD CONSTRAINT "user_interactions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_interactions" ADD CONSTRAINT "user_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stories" ADD CONSTRAINT "stories_reward_badge_id_fkey" FOREIGN KEY ("reward_badge_id") REFERENCES "public"."badges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaceDialogue" ADD CONSTRAINT "PlaceDialogue_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "public"."PlaceOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaceDialogue" ADD CONSTRAINT "PlaceDialogue_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "public"."stories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaceMission" ADD CONSTRAINT "PlaceMission_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "public"."PlaceOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaceStory" ADD CONSTRAINT "PlaceStory_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "public"."PlaceOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_collages" ADD CONSTRAINT "user_collages_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."collage_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_collages" ADD CONSTRAINT "user_collages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collage_templates" ADD CONSTRAINT "collage_templates_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "public"."stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompletedCourses" ADD CONSTRAINT "CompletedCourses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompletedCourses" ADD CONSTRAINT "CompletedCourses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_favorites" ADD CONSTRAINT "user_favorites_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_places" ADD CONSTRAINT "course_places_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_places" ADD CONSTRAINT "course_places_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."place_closed_days" ADD CONSTRAINT "place_closed_days_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."highlights" ADD CONSTRAINT "highlights_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."benefits" ADD CONSTRAINT "benefits_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_notices" ADD CONSTRAINT "course_notices_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userstoryprogress" ADD CONSTRAINT "userstoryprogress_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userstoryprogress" ADD CONSTRAINT "userstoryprogress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_submissions" ADD CONSTRAINT "mission_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompletedEscapes" ADD CONSTRAINT "CompletedEscapes_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "public"."stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompletedEscapes" ADD CONSTRAINT "CompletedEscapes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CourseTagToCourses" ADD CONSTRAINT "_CourseTagToCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CourseTagToCourses" ADD CONSTRAINT "_CourseTagToCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."course_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trees" ADD CONSTRAINT "trees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."water_logs" ADD CONSTRAINT "water_logs_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "public"."trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."water_logs" ADD CONSTRAINT "water_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gardens" ADD CONSTRAINT "gardens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."garden_trees" ADD CONSTRAINT "garden_trees_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "public"."gardens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."garden_trees" ADD CONSTRAINT "garden_trees_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "public"."trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
