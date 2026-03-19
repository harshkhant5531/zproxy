-- Remove deprecated geofence/session-anchor columns after switching to manual + IP attendance
ALTER TABLE "Session" DROP COLUMN IF EXISTS "geofenceRadius";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "facultyLat";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "facultyLng";
