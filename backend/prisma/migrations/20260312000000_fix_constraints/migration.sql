-- Migration: fix_constraints
-- Fixes three schema/DB mismatches introduced between the initial migration and current schema.

-- ─── 1. QrCode ────────────────────────────────────────────────────────────────
-- The initial migration created QrCode.sessionId as UNIQUE, but the schema intends
-- to allow multiple QR codes per session (only codeValue is @unique).
-- Additionally, QrCode.codeValue was declared @unique in the schema but never got
-- a DB unique index, so ON CONFLICT (codeValue) operations fail with 42P10.

DROP INDEX "QrCode_sessionId_key";
CREATE INDEX "QrCode_sessionId_idx" ON "QrCode"("sessionId");
CREATE UNIQUE INDEX "QrCode_codeValue_key" ON "QrCode"("codeValue");

-- ─── 2. Session ───────────────────────────────────────────────────────────────
-- Geofence columns were added to the schema after the initial migration.
-- Existing sessions default to 500m radius with no faculty anchor point.

ALTER TABLE "Session" ADD COLUMN "geofenceRadius" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "Session" ADD COLUMN "facultyLat" DOUBLE PRECISION;
ALTER TABLE "Session" ADD COLUMN "facultyLng" DOUBLE PRECISION;

-- ─── 3. Attendance ────────────────────────────────────────────────────────────
-- Prisma 7.x with @prisma/adapter-pg generates
-- ON CONFLICT ("sessionId", "studentId") DO NOTHING for createMany(skipDuplicates: true).
-- Without a matching unique constraint this fails with error 42P10.
-- A student should only have one attendance record per session, so this constraint
-- is semantically correct. Remove any pre-existing duplicates first (keep highest id).

DELETE FROM "Attendance"
WHERE "id" NOT IN (
  SELECT MAX("id") FROM "Attendance" GROUP BY "sessionId", "studentId"
);

CREATE UNIQUE INDEX "Attendance_sessionId_studentId_key" ON "Attendance"("sessionId", "studentId");
