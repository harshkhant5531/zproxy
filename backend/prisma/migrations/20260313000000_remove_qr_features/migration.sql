-- Migration: remove_qr_features
-- Removes legacy QR model/table and exam permit qrCode column.

ALTER TABLE "ExamPermit" DROP COLUMN IF EXISTS "qrCode";

DROP TABLE IF EXISTS "QrCode" CASCADE;
