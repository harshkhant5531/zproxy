/*
  Warnings:

  - A unique constraint covering the columns `[employeeId]` on the table `FacultyProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,courseId]` on the table `Subject` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeeId` to the `FacultyProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable (make nullable first)
ALTER TABLE `facultyprofile` ADD COLUMN `employeeId` VARCHAR(191);

-- Update existing records with unique values
UPDATE `facultyprofile` SET `employeeId` = CONCAT('FAC', LPAD(id, 6, '0')) WHERE `employeeId` IS NULL;

-- Make column not nullable
ALTER TABLE `facultyprofile` MODIFY COLUMN `employeeId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `FacultyProfile_employeeId_key` ON `FacultyProfile`(`employeeId`);

-- CreateIndex
CREATE UNIQUE INDEX `Subject_name_courseId_key` ON `Subject`(`name`, `courseId`);
