const express = require("express");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");
const { requireRole } = authMiddleware;
const {
  getGeofenceSecuritySettings,
  updateGeofenceSecuritySettings,
} = require("../utils/geofenceSecuritySettings");

const router = express.Router();

const normalizeIp = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "::1") return "127.0.0.1";
  if (trimmed.startsWith("::ffff:")) return trimmed.substring(7);
  return trimmed;
};

const getClientIp = (req) => {
  const xff = req.headers["x-forwarded-for"];
  const forwarded = Array.isArray(xff) ? xff[0] : xff;
  const firstForwarded =
    typeof forwarded === "string" ? forwarded.split(",")[0] : null;

  return (
    normalizeIp(req.headers["cf-connecting-ip"]) ||
    normalizeIp(req.headers["x-real-ip"]) ||
    normalizeIp(firstForwarded) ||
    normalizeIp(req.ip)
  );
};

const getDisplayName = (user) => {
  return (
    user?.adminProfile?.fullName ||
    user?.facultyProfile?.fullName ||
    user?.studentProfile?.fullName ||
    user?.username ||
    "Unknown"
  );
};

router.get(
  "/geofence-security",
  authMiddleware,
  requireRole(["admin"]),
  (req, res) => {
    const settings = getGeofenceSecuritySettings();
    res.json({ success: true, data: { settings } });
  },
);

router.put(
  "/geofence-security",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res, next) => {
    try {
      const payload = req.body || {};
      const previousSettings = getGeofenceSecuritySettings();
      const settings = updateGeofenceSecuritySettings(payload);

      const changedKeys = Object.keys(settings).filter(
        (key) => previousSettings[key] !== settings[key],
      );

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: "GEOFENCE_SECURITY_UPDATED",
          resourceType: "geofence_security",
          details: {
            changedKeys,
            previousValues: changedKeys.reduce((acc, key) => {
              acc[key] = previousSettings[key];
              return acc;
            }, {}),
            updatedValues: changedKeys.reduce((acc, key) => {
              acc[key] = settings[key];
              return acc;
            }, {}),
            changedBy: {
              id: req.user.id,
              username: req.user.username,
              role: req.user.role,
            },
            timestamp: new Date().toISOString(),
          },
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] || null,
        },
      });

      res.json({
        success: true,
        message: "Geofence security settings updated",
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/geofence-security/history",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res, next) => {
    try {
      const limitRaw = Number(req.query.limit);
      const limit = Number.isFinite(limitRaw)
        ? Math.max(10, Math.min(200, Math.round(limitRaw)))
        : 50;

      const records = await prisma.auditLog.findMany({
        where: {
          action: "GEOFENCE_SECURITY_UPDATED",
          resourceType: "geofence_security",
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              adminProfile: { select: { fullName: true } },
              facultyProfile: { select: { fullName: true } },
              studentProfile: { select: { fullName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      const history = records.map((record) => {
        const details = record.details || {};
        return {
          id: record.id,
          createdAt: record.createdAt,
          changedKeys: Array.isArray(details.changedKeys)
            ? details.changedKeys
            : [],
          previousValues:
            typeof details.previousValues === "object" && details.previousValues
              ? details.previousValues
              : {},
          updatedValues:
            typeof details.updatedValues === "object" && details.updatedValues
              ? details.updatedValues
              : {},
          ipAddress: record.ipAddress,
          changedBy: {
            id: record.user?.id,
            username: record.user?.username,
            role: record.user?.role,
            displayName: getDisplayName(record.user),
          },
        };
      });

      res.json({ success: true, data: { history } });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
