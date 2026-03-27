-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "attendanceCode" TEXT,
ADD COLUMN     "attendanceCodeExpiry" TIMESTAMP(3);
