/*
  Warnings:

  - You are about to drop the column `refreshToken` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `completed` on the `Task` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[refreshTokenHash]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,operationId]` on the table `SyncOperation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `refreshTokenHash` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Session_refreshToken_key";

-- DropIndex
DROP INDEX "SyncOperation_operationId_key";

-- DropIndex
DROP INDEX "Task_userId_completed_deletedAt_idx";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "refreshToken",
ADD COLUMN     "refreshTokenHash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SyncOperation" ADD COLUMN     "result" JSONB;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "completed",
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_revokedAt_idx" ON "Session"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncOperation_userId_operationId_key" ON "SyncOperation"("userId", "operationId");

-- CreateIndex
CREATE INDEX "Task_userId_priority_deletedAt_idx" ON "Task"("userId", "priority", "deletedAt");

-- CreateIndex
CREATE INDEX "Task_userId_reminderAt_reminderSentAt_idx" ON "Task"("userId", "reminderAt", "reminderSentAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- AddForeignKey
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
