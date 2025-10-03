/*
  Warnings:

  - You are about to drop the column `createdat` on the `user_checkins` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `user_checkins` table. All the data in the column will be lost.
  - You are about to drop the column `createdat` on the `user_rewards` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `user_rewards` table. All the data in the column will be lost.
  - Added the required column `userId` to the `user_checkins` table without a default value. This is not possible if the table is not empty.
  - Made the column `rewarded` on table `user_checkins` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `userId` to the `user_rewards` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `user_rewards` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unit` on the `user_rewards` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."RewardType" AS ENUM ('signup', 'checkin', 'ad_watch', 'purchase', 'event');

-- CreateEnum
CREATE TYPE "public"."RewardUnit" AS ENUM ('coin', 'coupon');

-- DropForeignKey
ALTER TABLE "public"."user_checkins" DROP CONSTRAINT "fk_user_checkin";

-- DropForeignKey
ALTER TABLE "public"."user_rewards" DROP CONSTRAINT "fk_user";

-- AlterTable
ALTER TABLE "public"."user_checkins" DROP COLUMN "createdat",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "rewarded" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."user_rewards" DROP COLUMN "createdat",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" INTEGER NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "public"."RewardType" NOT NULL,
DROP COLUMN "unit",
ADD COLUMN     "unit" "public"."RewardUnit" NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "coinBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "couponCount" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "public"."user_rewards" ADD CONSTRAINT "user_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_checkins" ADD CONSTRAINT "user_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
