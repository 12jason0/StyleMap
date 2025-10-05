/*
  Warnings:

  - You are about to drop the column `mission_payload` on the `storychapters` table. All the data in the column will be lost.
  - You are about to drop the column `mission_type` on the `storychapters` table. All the data in the column will be lost.
  - You are about to drop the column `puzzle_text` on the `storychapters` table. All the data in the column will be lost.

*/
-- -- AlterTable
-- ALTER TABLE "public"."storychapters" DROP COLUMN "mission_payload",
-- DROP COLUMN "mission_type",
-- DROP COLUMN "puzzle_text";

-- CreateTable
CREATE TABLE "public"."PlaceOption" (
    "id" SERIAL NOT NULL,
    "chapterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "PlaceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlaceMission" (
    "id" SERIAL NOT NULL,
    "placeId" INTEGER NOT NULL,
    "missionNumber" INTEGER NOT NULL,
    "missionType" TEXT NOT NULL,
    "missionPayload" JSONB,
    "description" TEXT,

    CONSTRAINT "PlaceMission_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PlaceOption" ADD CONSTRAINT "PlaceOption_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."storychapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaceMission" ADD CONSTRAINT "PlaceMission_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "public"."PlaceOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
