/*
  Warnings:

  - You are about to drop the column `memberId` on the `ActivityEvent` table. All the data in the column will be lost.
  - Added the required column `userId` to the `ActivityEvent` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ActivityEvent" DROP CONSTRAINT "ActivityEvent_memberId_fkey";

-- DropForeignKey
ALTER TABLE "ModerationLog" DROP CONSTRAINT "ModerationLog_targetUserId_fkey";

-- DropIndex
DROP INDEX "ActivityEvent_memberId_timestamp_idx";

-- AlterTable
ALTER TABLE "ActivityEvent" DROP COLUMN "memberId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "excludeRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_timestamp_idx" ON "ActivityEvent"("userId", "timestamp");
