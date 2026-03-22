const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");
const { requireRole } = authMiddleware;
const {
  assertStudentCheckInWindowOpen,
} = require("../utils/sessionAttendanceWindow");

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

const normalizeDeviceFingerprint = (value) => {
  if (!value || typeof value !== "string") return null;
  const compact = value.trim().toLowerCase();
  return compact.length > 0 ? compact.slice(0, 180) : null;
};

const parseClockTimeToMinutes = (value) => {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
};

const ipV4ToNumber = (ip) => {
  if (!ip || typeof ip !== "string") return null;
  const octets = ip.split(".");
  if (octets.length !== 4) return null;
  const values = octets.map((part) => Number.parseInt(part, 10));
  if (values.some((v) => Number.isNaN(v) || v < 0 || v > 255)) return null;
  return (
    ((values[0] << 24) >>> 0) +
    ((values[1] << 16) >>> 0) +
    ((values[2] << 8) >>> 0) +
    (values[3] >>> 0)
  );
};

const numberToIpV4 = (value) => {
  const safe = Number(value) >>> 0;
  return [
    (safe >>> 24) & 255,
    (safe >>> 16) & 255,
    (safe >>> 8) & 255,
    safe & 255,
  ].join(".");
};

const buildCidrFromIp = (ip, prefixLength) => {
  const ipNumber = ipV4ToNumber(ip);
  if (ipNumber === null) return null;

  const parsedPrefix = Number.parseInt(String(prefixLength), 10);
  const prefix =
    Number.isNaN(parsedPrefix) || parsedPrefix < 0 || parsedPrefix > 32
      ? 24
      : parsedPrefix;

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const networkNumber = ipNumber & mask;
  return `${numberToIpV4(networkNumber)}/${prefix}`;
};

const parseAllowedCampusCidrs = () => {
  const raw = String(process.env.CAMPUS_WIFI_CIDRS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const normalized = raw
    .map((entry) => {
      if (entry.includes("/")) return entry;
      return /^\d+\.\d+\.\d+\.\d+$/.test(entry) ? `${entry}/32` : entry;
    })
    .filter((entry) => entry.includes("/"));

  // Fallback: infer campus subnet from configured network IP.
  if (normalized.length === 0) {
    const inferredSource =
      process.env.VITE_NETWORK_IP || process.env.FRONTEND_URL || "";
    const match = String(inferredSource).match(/(\d+\.\d+\.\d+\.\d+)/);
    if (match && ipV4ToNumber(match[1]) !== null) {
      const fallbackPrefix =
        process.env.CAMPUS_WIFI_FALLBACK_PREFIX ||
        process.env.CAMPUS_WIFI_PREFIX ||
        "24";
      const inferredCidr = buildCidrFromIp(match[1], fallbackPrefix);
      if (inferredCidr) return [inferredCidr];
    }
  }

  return normalized;
};

const isIpInCidr = (ip, cidr) => {
  const [networkIp, prefixLengthRaw] = String(cidr || "").split("/");
  const prefixLength = Number.parseInt(prefixLengthRaw, 10);
  const ipNumber = ipV4ToNumber(ip);
  const networkNumber = ipV4ToNumber(networkIp);

  if (
    ipNumber === null ||
    networkNumber === null ||
    Number.isNaN(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > 32
  ) {
    return false;
  }

  const mask =
    prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipNumber & mask) === (networkNumber & mask);
};

const evaluateCampusWifiAccess = (clientIp) => {
  const normalized = normalizeIp(clientIp);

  if (!normalized) {
    return {
      allowed: false,
      normalizedIp: null,
      matchedCidr: null,
      allowlist: [],
      reason: "missing_client_ip",
    };
  }

  // Allow localhost during development only.
  if (process.env.NODE_ENV !== "production" && normalized === "127.0.0.1") {
    return {
      allowed: true,
      normalizedIp: normalized,
      matchedCidr: "dev-localhost-bypass",
      allowlist: [],
      reason: "dev_localhost_bypass",
    };
  }

  // IPv6 is not currently supported in campus allowlist matching.
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) {
    return {
      allowed: false,
      normalizedIp: normalized,
      matchedCidr: null,
      allowlist: [],
      reason: "unsupported_ip_family",
    };
  }

  const cidrs = parseAllowedCampusCidrs();
  if (cidrs.length === 0) {
    return {
      allowed: false,
      normalizedIp: normalized,
      matchedCidr: null,
      allowlist: [],
      reason: "empty_allowlist",
    };
  }

  const matchedCidr =
    cidrs.find((cidr) => isIpInCidr(normalized, cidr)) || null;

  return {
    allowed: Boolean(matchedCidr),
    normalizedIp: normalized,
    matchedCidr,
    allowlist: cidrs,
    reason: matchedCidr ? "matched_allowlist" : "outside_allowlist",
  };
};

const isAllowedCampusWifiIp = (clientIp) => {
  return evaluateCampusWifiAccess(clientIp).allowed;
};

const appendNotes = (existingNotes, tags = []) => {
  const cleanTags = tags.filter(Boolean);
  if (!cleanTags.length) return existingNotes || null;
  const suffix = cleanTags.join(" ");
  return existingNotes ? `${existingNotes} ${suffix}` : suffix;
};

const parseProxyAttendanceDetail = (notes, status) => {
  const noteStr = notes || "";
  const signals = [];

  if (noteStr.includes("[PROXY_DETECTED")) {
    const m = noteStr.match(/sharedWith:(\d+)/);
    signals.push({
      code: "PROXY_DETECTED",
      label: "Strong integrity violation",
      detail: m
        ? `Same device fingerprint as student #${m[1]} in this session.`
        : "Proxy or shared-device pattern detected.",
    });
  }
  if (noteStr.includes("[PROXY_SUSPECT")) {
    signals.push({
      code: "PROXY_SUSPECT",
      label: "Suspicious attendance pattern",
      detail: "Flagged for manual review.",
    });
  }
  if (noteStr.includes("[AUTO_ABSENT:PROXY")) {
    signals.push({
      code: "AUTO_ABSENT_PROXY",
      label: "Auto-marked absent (proxy rule)",
      detail: "System applied an automated absent status.",
    });
  }
  const ipShared = noteStr.match(/\[IP_SHARED:count=(\d+)\]/);
  if (ipShared) {
    const n = parseInt(ipShared[1], 10);
    signals.push({
      code: "SHARED_IP",
      label: "Shared campus / NAT IP",
      detail: `${n} other student(s) checked in from this address; common on Wi-Fi, not proof alone.`,
    });
  }

  let riskScore = 18;
  if (noteStr.includes("[PROXY_DETECTED")) riskScore = 88;
  else if (noteStr.includes("[AUTO_ABSENT:PROXY")) riskScore = 70;
  else if (noteStr.includes("[PROXY_SUSPECT")) riskScore = 58;
  if (status === "absent") riskScore = Math.min(100, riskScore + 6);
  if (ipShared && parseInt(ipShared[1], 10) >= 2) {
    riskScore = Math.min(100, riskScore + 4);
  }

  const riskLabel =
    riskScore >= 80
      ? "critical"
      : riskScore >= 60
        ? "high"
        : riskScore >= 40
          ? "moderate"
          : "low";

  return { signals, riskScore, riskLabel };
};

const logAttendanceAttempt = async ({
  req,
  userId,
  sessionId,
  attemptType,
  decision,
  reason,
  security,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "ATTENDANCE_ATTEMPT",
        resourceType: attemptType,
        resourceId: Number.isFinite(sessionId) ? sessionId : null,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
        details: {
          decision,
          reason,
          security,
          deviceInfo: normalizeDeviceFingerprint(req.body?.deviceInfo),
          resolvedClientIp: getClientIp(req),
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (logError) {
    console.warn(
      "Failed to log attendance attempt:",
      logError?.message || logError,
    );
  }
};

// @route   GET /api/attendance
// @desc    Get user's attendance or all attendance (admin)
// @access  Admin, Faculty, Student
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { studentId, sessionId, status, page = 1, limit = 10 } = req.query;

    const where = {};

    if (studentId) {
      where.studentId = parseInt(studentId);
    } else if (req.user.role === "student") {
      where.studentId = req.user.id;
    }

    if (sessionId) where.sessionId = parseInt(sessionId);
    if (status) where.status = status;

    // For faculty, show attendance only for their sessions
    if (req.user.role === "faculty") {
      where.session = { facultyId: req.user.id };
    }

    const skip = (page - 1) * limit;

    const [attendanceRecords, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          student: {
            select: {
              id: true,
              username: true,
              studentProfile: {
                select: {
                  fullName: true,
                  rollNumber: true,
                  enrollmentNumber: true,
                },
              },
            },
          },
          session: {
            select: {
              id: true,
              topic: true,
              date: true,
              course: { select: { name: true, code: true } },
              subject: { select: { name: true } },
            },
          },
        },
        orderBy: { timestamp: "desc" },
      }),
      prisma.attendance.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        attendanceRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/attendance/proxy-audit
// @desc    Audit proxy-flagged attendance with comprehensive analytics
// @access  Admin, Faculty
router.get(
  "/proxy-audit",
  authMiddleware,
  requireRole(["admin", "faculty"]),
  async (req, res, next) => {
    let auditContext = {
      attemptType: "manual",
      sessionId: null,
      decision: "rejected",
      reason: "unknown",
      security: null,
    };

    try {
      const {
        sessionId,
        courseId,
        studentId,
        from,
        to,
        page = 1,
        limit = 20,
      } = req.query;

      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (parsedPage - 1) * parsedLimit;

      const baseWhere = {};
      if (sessionId) baseWhere.sessionId = parseInt(sessionId, 10);
      if (studentId) baseWhere.studentId = parseInt(studentId, 10);
      if (from || to) {
        baseWhere.timestamp = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        };
      }

      // Scope by course and faculty ownership.
      baseWhere.session = {
        ...(courseId ? { courseId: parseInt(courseId, 10) } : {}),
        ...(req.user.role === "faculty" ? { facultyId: req.user.id } : {}),
      };

      const flaggedWhere = {
        ...baseWhere,
        OR: [
          { notes: { contains: "[PROXY_SUSPECT" } },
          { notes: { contains: "[PROXY_DETECTED" } },
          { notes: { contains: "[AUTO_ABSENT:PROXY" } },
        ],
      };

      const [records, total, analyticsRecords, allRecordsForStats] =
        await Promise.all([
          prisma.attendance.findMany({
            where: flaggedWhere,
            skip,
            take: parsedLimit,
            include: {
              student: {
                select: {
                  id: true,
                  username: true,
                  studentProfile: {
                    select: {
                      fullName: true,
                      enrollmentNumber: true,
                      rollNumber: true,
                      batch: true,
                    },
                  },
                },
              },
              session: {
                select: {
                  id: true,
                  topic: true,
                  date: true,
                  facultyId: true,
                  course: { select: { id: true, code: true, name: true } },
                  subject: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { timestamp: "desc" },
          }),
          prisma.attendance.count({ where: flaggedWhere }),
          prisma.attendance.findMany({
            where: baseWhere,
            select: {
              id: true,
              sessionId: true,
              studentId: true,
              status: true,
              timestamp: true,
              ipAddress: true,
              notes: true,
              deviceInfo: true,
            },
            orderBy: { timestamp: "desc" },
            take: 5000,
          }),
          prisma.attendance.findMany({
            where: baseWhere,
            select: {
              studentId: true,
              status: true,
              timestamp: true,
              ipAddress: true,
              notes: true,
            },
            take: 10000,
          }),
        ]);

      // Enhanced Analytics Calculations
      const ipSessionMap = new Map();
      const hotspotHours = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        flaggedCount: 0,
        totalCount: 0,
      }));
      const linkMap = new Map();
      const dailyTrends = new Map();
      const studentRiskMap = new Map();
      const devicePatterns = new Map();
      const ipGeoMap = new Map();

      // Process analytics records
      for (const row of analyticsRecords) {
        const ip = row.ipAddress || "unknown";
        const sessionKey = `${row.sessionId}::${ip}`;
        const isFlagged = (row.notes || "").includes("[PROXY_");
        const existing = ipSessionMap.get(sessionKey) || {
          sessionId: row.sessionId,
          ipAddress: ip,
          attendanceIds: [],
          students: new Set(),
          flagged: 0,
          total: 0,
        };

        existing.attendanceIds.push(row.id);
        existing.students.add(row.studentId);
        existing.total += 1;
        if (isFlagged) existing.flagged += 1;
        ipSessionMap.set(sessionKey, existing);

        // Hourly heatmap
        const timestamp = new Date(row.timestamp);
        const hr = timestamp.getHours();
        if (hotspotHours[hr]) {
          hotspotHours[hr].totalCount += 1;
          if (isFlagged) hotspotHours[hr].flaggedCount += 1;
        }

        // Daily trends
        const dayKey = timestamp.toISOString().split("T")[0];
        const dayEntry = dailyTrends.get(dayKey) || {
          date: dayKey,
          flagged: 0,
          total: 0,
          riskScore: 0,
        };
        dayEntry.total += 1;
        if (isFlagged) dayEntry.flagged += 1;
        dailyTrends.set(dayKey, dayEntry);

        // Student risk profiles
        const studentEntry = studentRiskMap.get(row.studentId) || {
          studentId: row.studentId,
          flaggedCount: 0,
          totalCount: 0,
          ips: new Set(),
          severitySum: 0,
        };
        studentEntry.totalCount += 1;
        studentEntry.ips.add(ip);
        if (isFlagged) {
          studentEntry.flaggedCount += 1;
          if ((row.notes || "").includes("[PROXY_DETECTED"))
            studentEntry.severitySum += 3;
          else if ((row.notes || "").includes("[PROXY_SUSPECT"))
            studentEntry.severitySum += 2;
          else studentEntry.severitySum += 1;
        }
        studentRiskMap.set(row.studentId, studentEntry);

        // Device patterns
        const device = row.deviceInfo || "unknown-device";
        const deviceEntry = devicePatterns.get(device) || {
          device,
          count: 0,
          flagged: 0,
        };
        deviceEntry.count += 1;
        if (isFlagged) deviceEntry.flagged += 1;
        devicePatterns.set(device, deviceEntry);

        // Linked pairs
        if (isFlagged) {
          const match = String(row.notes || "").match(/sharedWith:(\d+)/);
          if (match) {
            const otherId = parseInt(match[1], 10);
            const a = Math.min(row.studentId, otherId);
            const b = Math.max(row.studentId, otherId);
            const edgeKey = `${a}-${b}`;
            const edge = linkMap.get(edgeKey) || {
              studentA: a,
              studentB: b,
              occurrences: 0,
            };
            edge.occurrences += 1;
            linkMap.set(edgeKey, edge);
          }
        }
      }

      // Calculate day-by-day metrics
      const dailyTrendArray = Array.from(dailyTrends.values())
        .map((day) => ({
          ...day,
          riskScore: day.total
            ? Math.round((day.flagged / day.total) * 100)
            : 0,
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-30); // Last 30 days

      // Calculate peak risk hours
      const peakRiskHours = hotspotHours
        .map((h) => ({
          ...h,
          riskPercentage: h.totalCount
            ? Math.round((h.flaggedCount / h.totalCount) * 100)
            : 0,
        }))
        .sort((a, b) => b.riskPercentage - a.riskPercentage)
        .slice(0, 5);

      // Students with at least one proxy-class flag (exclude IP-only noise from "at risk" rollups)
      const flaggedStudentProfiles = Array.from(studentRiskMap.values())
        .filter((s) => s.flaggedCount > 0)
        .map((s) => {
          const flagRate = s.totalCount
            ? (s.flaggedCount / s.totalCount) * 100
            : 0;
          const ipVariance = s.ips.size;
          let anomalyScore =
            flagRate * 0.6 + ipVariance * 5 + (s.severitySum || 0) * 2;
          anomalyScore = Math.min(100, anomalyScore);
          return {
            studentId: s.studentId,
            flaggedCount: s.flaggedCount,
            totalCount: s.totalCount,
            uniqueIps: ipVariance,
            flagRate: Math.round(flagRate),
            anomalyScore: Math.round(anomalyScore),
            riskLevel:
              anomalyScore >= 75
                ? "critical"
                : anomalyScore >= 50
                  ? "high"
                  : anomalyScore >= 25
                    ? "moderate"
                    : "low",
          };
        })
        .sort((a, b) => b.anomalyScore - a.anomalyScore);

      const profileIds = flaggedStudentProfiles.map((p) => p.studentId);
      const studentRows =
        profileIds.length > 0
          ? await prisma.users.findMany({
              where: { id: { in: profileIds } },
              select: {
                id: true,
                username: true,
                studentProfile: {
                  select: { fullName: true, rollNumber: true },
                },
              },
            })
          : [];
      const studentMeta = new Map(studentRows.map((u) => [u.id, u]));

      const namedFlaggedProfiles = flaggedStudentProfiles.map((p) => {
        const u = studentMeta.get(p.studentId);
        return {
          ...p,
          studentName:
            u?.studentProfile?.fullName ||
            u?.username ||
            `Student #${p.studentId}`,
          rollNumber: u?.studentProfile?.rollNumber ?? null,
        };
      });

      const studentRiskProfiles = namedFlaggedProfiles.slice(0, 25);

      // Device risk analysis
      const deviceRiskAnalysis = Array.from(devicePatterns.values())
        .map((d) => ({
          device: d.device,
          totalEvents: d.count,
          flaggedEvents: d.flagged,
          riskPercentage: d.count ? Math.round((d.flagged / d.count) * 100) : 0,
        }))
        .sort((a, b) => b.riskPercentage - a.riskPercentage)
        .slice(0, 10);

      // Shared IP clusters
      const sharedIpClusters = Array.from(ipSessionMap.values())
        .filter((row) => row.students.size > 1)
        .map((row) => ({
          sessionId: row.sessionId,
          ipAddress: row.ipAddress,
          uniqueStudents: row.students.size,
          attendanceEvents: row.attendanceIds.length,
          flaggedEvents: row.flagged,
          riskPercentage: row.total
            ? Math.round((row.flagged / row.total) * 100)
            : 0,
        }))
        .sort((a, b) => b.uniqueStudents - a.uniqueStudents)
        .slice(0, 25);

      // Top linked pairs
      const topLinkedPairs = Array.from(linkMap.values())
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 20);

      // IP address frequency analysis
      const ipFrequencyMap = new Map();
      for (const row of analyticsRecords) {
        const ip = row.ipAddress || "unknown";
        const entry = ipFrequencyMap.get(ip) || {
          ipAddress: ip,
          count: 0,
          flagged: 0,
          students: new Set(),
        };
        entry.count += 1;
        entry.students.add(row.studentId);
        if ((row.notes || "").includes("[PROXY_")) entry.flagged += 1;
        ipFrequencyMap.set(ip, entry);
      }

      const topIpAddresses = Array.from(ipFrequencyMap.values())
        .map((entry) => ({
          ipAddress: entry.ipAddress,
          totalEvents: entry.count,
          flaggedEvents: entry.flagged,
          uniqueStudents: entry.students.size,
          riskPercentage: entry.count
            ? Math.round((entry.flagged / entry.count) * 100)
            : 0,
        }))
        .sort((a, b) => b.totalEvents - a.totalEvents)
        .slice(0, 15);

      // Time-based analysis: flagged events by day of week
      const dayOfWeekMap = new Map();
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      for (const row of analyticsRecords) {
        const timestamp = new Date(row.timestamp);
        const dayOfWeek = timestamp.getDay();
        const dayEntry = dayOfWeekMap.get(dayOfWeek) || {
          day: dayNames[dayOfWeek],
          dayIndex: dayOfWeek,
          flagged: 0,
          total: 0,
        };
        dayEntry.total += 1;
        if ((row.notes || "").includes("[PROXY_")) dayEntry.flagged += 1;
        dayOfWeekMap.set(dayOfWeek, dayEntry);
      }

      const dayOfWeekAnalysis = Array.from(dayOfWeekMap.values())
        .map((d) => ({
          ...d,
          riskPercentage: d.total ? Math.round((d.flagged / d.total) * 100) : 0,
        }))
        .sort((a, b) => a.dayIndex - b.dayIndex);

      // Calculate overall statistics
      const allFlaggedCount = allRecordsForStats.filter((r) =>
        (r.notes || "").includes("[PROXY_"),
      ).length;
      const allTotalCount = allRecordsForStats.length;
      const flagRatePercent =
        allTotalCount > 0
          ? Math.round((allFlaggedCount / allTotalCount) * 100)
          : 0;

      const flaggedRecords = records.map((row) => {
        const detail = parseProxyAttendanceDetail(row.notes, row.status);
        return {
          ...row,
          riskScore: detail.riskScore,
          riskLabel: detail.riskLabel,
          proxyDetail: { signals: detail.signals },
        };
      });

      res.json({
        success: true,
        data: {
          records: flaggedRecords,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit),
          },
          analytics: {
            summary: {
              totalFlagged: total,
              totalAttendance: allTotalCount,
              flagRatePercent,
              detectionAccuracy: flagRatePercent,
              uniqueStudentsAtRisk: flaggedStudentProfiles.length,
              criticalRiskCount: flaggedStudentProfiles.filter(
                (s) => s.riskLevel === "critical",
              ).length,
              highRiskCount: flaggedStudentProfiles.filter(
                (s) => s.riskLevel === "high",
              ).length,
              moderateRiskCount: flaggedStudentProfiles.filter(
                (s) => s.riskLevel === "moderate",
              ).length,
              lowRiskCount: flaggedStudentProfiles.filter(
                (s) => s.riskLevel === "low",
              ).length,
            },
            sharedIpClusters,
            dailyTrends: dailyTrendArray,
            hotspotHours,
            peakRiskHours,
            topLinkedPairs,
            studentRiskProfiles,
            deviceRiskAnalysis,
            topIpAddresses,
            dayOfWeekAnalysis,
            generatedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/attendance/network-check
// @desc    Diagnose campus WiFi allowlist matching for current request IP
// @access  Admin
router.get(
  "/network-check",
  authMiddleware,
  requireRole(["admin"]),
  async (req, res, next) => {
    try {
      const detectedIp = getClientIp(req);
      const check = evaluateCampusWifiAccess(detectedIp);

      res.json({
        success: true,
        data: {
          detectedIp: check.normalizedIp,
          isAllowed: check.allowed,
          matchedCidr: check.matchedCidr,
          reason: check.reason,
          allowlist: {
            total: check.allowlist.length,
            preview: check.allowlist.slice(0, 20),
          },
          proxyHeaders: {
            cfConnectingIp: req.headers["cf-connecting-ip"] || null,
            xRealIp: req.headers["x-real-ip"] || null,
            xForwardedFor: req.headers["x-forwarded-for"] || null,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/attendance/:id
// @desc    Get attendance record by ID
// @access  Admin, Faculty, Student
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const attendance = await prisma.attendance.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: { include: { studentProfile: true } },
        session: {
          include: {
            course: true,
            faculty: true,
            subject: true,
          },
        },
      },
    });

    if (!attendance) {
      const error = new Error("Attendance record not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access
    if (req.user.role === "student" && attendance.studentId !== req.user.id) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    if (
      req.user.role === "faculty" &&
      attendance.session.facultyId !== req.user.id
    ) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    res.json({
      success: true,
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/attendance
// @desc    Create new attendance record
// @access  Admin, Faculty, Student
router.post(
  "/",
  authMiddleware,
  [body("sessionId").isInt().withMessage("Session ID is required")],
  async (req, res, next) => {
    let auditContext = {
      attemptType: "manual",
      sessionId: null,
      decision: "rejected",
      reason: "unknown",
      security: null,
    };

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("Validation Error");
        error.statusCode = 400;
        error.errors = errors.array();
        throw error;
      }

      const { sessionId, status, notes } = req.body;
      const parsedSessionId = Number.parseInt(String(sessionId), 10);

      if (!Number.isFinite(parsedSessionId)) {
        const error = new Error("Session ID is required");
        error.statusCode = 400;
        error.reasonCode = "invalid_session_id";
        throw error;
      }

      // Find session
      const session = await prisma.session.findUnique({
        where: { id: parsedSessionId },
        include: {
          course: { include: { students: true } },
        },
      });

      if (!session) {
        const error = new Error("Session not found");
        error.statusCode = 404;
        error.reasonCode = "session_not_found";
        throw error;
      }

      // Determine student ID
      let studentId = req.user.id;
      if (req.user.role === "admin" || req.user.role === "faculty") {
        const { studentId: reqStudentId } = req.body;
        if (!reqStudentId) {
          const error = new Error("Student ID is required");
          error.statusCode = 400;
          throw error;
        }
        studentId = reqStudentId;
      }

      auditContext.sessionId = parsedSessionId;

      // Student self check-in must happen during a valid live window.
      if (req.user.role === "student") {
        if (session.status === "completed") {
          const error = new Error(
            "This session is closed. Attendance can no longer be marked.",
          );
          error.statusCode = 403;
          error.reasonCode = "session_closed";
          throw error;
        }

        const now = new Date();
        const sessionDate = new Date(session.date);
        const isSameLocalDate =
          now.getFullYear() === sessionDate.getFullYear() &&
          now.getMonth() === sessionDate.getMonth() &&
          now.getDate() === sessionDate.getDate();

        if (!isSameLocalDate) {
          const error = new Error(
            "Attendance can only be marked on the scheduled session date.",
          );
          error.statusCode = 403;
          error.reasonCode = "attendance_not_on_session_day";
          throw error;
        }

        const startMinutes = parseClockTimeToMinutes(session.startTime);
        const endMinutes = parseClockTimeToMinutes(session.endTime);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const earlyWindowMinutes = 10;
        const lateGraceMinutes = 10;

        if (
          startMinutes !== null &&
          endMinutes !== null &&
          nowMinutes < startMinutes - earlyWindowMinutes
        ) {
          const error = new Error(
            "Check-in has not opened yet for this session.",
          );
          error.statusCode = 403;
          error.reasonCode = "session_not_started";
          throw error;
        }

        if (
          startMinutes !== null &&
          endMinutes !== null &&
          nowMinutes > endMinutes + lateGraceMinutes
        ) {
          const error = new Error(
            "Check-in window has ended for this session.",
          );
          error.statusCode = 403;
          error.reasonCode = "session_checkin_window_closed";
          throw error;
        }
      }

      // Check if student is enrolled in the course
      const isEnrolledInCourse = session.course.students.some(
        (student) => student.id === studentId,
      );

      if (!isEnrolledInCourse) {
        const error = new Error("Student is not enrolled in this course");
        error.statusCode = 400;
        error.reasonCode = "student_not_enrolled_course";
        throw error;
      }

      // Fetch student once for all profile-based checks
      const needsProfileCheck =
        session.subjectId || (session.batches && session.batches.length > 0);
      if (needsProfileCheck) {
        const student = await prisma.users.findUnique({
          where: { id: studentId },
          include: { studentSubjects: true, studentProfile: true },
        });

        // Check subject enrollment
        if (session.subjectId) {
          const isEnrolledInSubject = (student.studentSubjects || []).some(
            (s) => s.id === session.subjectId,
          );
          if (!isEnrolledInSubject) {
            const error = new Error("Student is not enrolled in this subject");
            error.statusCode = 400;
            error.reasonCode = "student_not_enrolled_subject";
            throw error;
          }
        }

        // Check batch restriction
        if (session.batches && session.batches.length > 0) {
          const studentBatch = student?.studentProfile?.batch;
          if (!studentBatch || !session.batches.includes(studentBatch)) {
            const error = new Error(
              `This session is restricted to batch(es): ${session.batches.join(", ")}. Your batch (${studentBatch || "unknown"}) is not included.`,
            );
            error.statusCode = 403;
            error.reasonCode = "student_batch_not_allowed";
            throw error;
          }
        }
      }

      if (req.user.role === "student") {
        assertStudentCheckInWindowOpen(session);
      }

      // Check if attendance already exists
      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          sessionId,
          studentId,
        },
      });

      if (existingAttendance) {
        const error = new Error("Attendance record already exists");
        error.statusCode = 409;
        error.reasonCode = "duplicate_attendance";
        throw error;
      }

      // ─── Proxy Detection ────────────────────────────────────────────────
      let finalStatus = status || "present";
      let finalNotes = notes || null;
      const clientIp = getClientIp(req);
      const normalizedDeviceInfo = normalizeDeviceFingerprint(
        req.body.deviceInfo,
      );

      if (req.user.role === "student" && !normalizedDeviceInfo) {
        const error = new Error(
          "Device integrity metadata is required to mark attendance.",
        );
        error.statusCode = 400;
        error.reasonCode = "missing_device_fingerprint";
        error.decisionReason = "missing_device_fingerprint";
        throw error;
      }

      if (req.user.role === "student" && !isAllowedCampusWifiIp(clientIp)) {
        const detectedIp = clientIp || "unknown";
        const error = new Error(
          `Attendance can only be marked from the approved campus WiFi network. Detected IP: ${detectedIp}`,
        );
        error.statusCode = 403;
        error.reasonCode = "outside_campus_wifi";
        error.decisionReason = "outside_campus_wifi";
        throw error;
      }

      if (clientIp && req.user.role === "student") {
        const sameDeviceAnyRecord = normalizedDeviceInfo
          ? await prisma.attendance.findFirst({
              where: {
                sessionId,
                studentId: { not: studentId },
                deviceInfo: normalizedDeviceInfo,
              },
              select: { id: true, studentId: true, notes: true },
            })
          : null;

        if (sameDeviceAnyRecord) {
          const error = new Error(
            "Potential proxy detected: device fingerprint already used by another student in this session.",
          );
          error.statusCode = 409;
          error.reasonCode = "proxy_same_device_session";
          error.decisionReason = "proxy_same_device_session";
          throw error;
        }

        const sameIpRecords = await prisma.attendance.findMany({
          where: {
            sessionId,
            studentId: { not: studentId },
            ipAddress: clientIp,
          },
          select: { id: true, studentId: true, notes: true, deviceInfo: true },
        });

        if (sameIpRecords.length > 0) {
          // Check for strong proxy signal: same device identifier
          const deviceInfo = normalizedDeviceInfo || "";
          const sameDeviceRecord = deviceInfo
            ? sameIpRecords.find(
                (r) => r.deviceInfo && r.deviceInfo === deviceInfo,
              )
            : null;

          if (sameDeviceRecord) {
            // Same IP + same device = strong proxy signal
            finalStatus = "absent";
            finalNotes = appendNotes(finalNotes, [
              `[PROXY_DETECTED:sharedWith:${sameDeviceRecord.studentId}:SAME_DEVICE]`,
            ]);

            // Retroactively flag the earlier record too
            const prevNotes = sameDeviceRecord.notes || "";
            if (!prevNotes.includes("[PROXY_")) {
              await prisma.attendance.update({
                where: { id: sameDeviceRecord.id },
                data: {
                  status: "absent",
                  notes: appendNotes(prevNotes, [
                    `[PROXY_DETECTED:sharedWith:${studentId}:SAME_DEVICE]`,
                  ]),
                },
              });
            }
          } else {
            // Same IP but different device — likely campus WiFi (shared NAT)
            // Add informational tag but do NOT change status
            finalNotes = appendNotes(finalNotes, [
              `[IP_SHARED:count=${sameIpRecords.length}]`,
            ]);
          }
        }
      }

      // Create attendance record
      const attendance = await prisma.attendance.create({
        data: {
          sessionId,
          studentId,
          status: finalStatus,
          notes: finalNotes,
          ipAddress: clientIp,
          deviceInfo: normalizedDeviceInfo,
        },
        include: {
          student: { include: { studentProfile: true } },
          session: {
            include: {
              course: true,
              faculty: true,
              subject: true,
            },
          },
        },
      });

      // Update attendance count in session
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          attendanceCount: { increment: 1 },
        },
      });

      auditContext.decision = "accepted";
      auditContext.reason =
        finalStatus === "absent" ? "accepted_proxy_flagged" : "accepted";
      await logAttendanceAttempt({
        req,
        userId: req.user.id,
        sessionId: parsedSessionId,
        attemptType: auditContext.attemptType,
        decision: auditContext.decision,
        reason: auditContext.reason,
        security: auditContext.security,
      });

      res.status(201).json({
        success: true,
        message: "Attendance recorded successfully",
        data: { attendance },
      });
    } catch (error) {
      auditContext.reason =
        error.reasonCode || error.decisionReason || error.message || "rejected";
      await logAttendanceAttempt({
        req,
        userId: req.user.id,
        sessionId: auditContext.sessionId,
        attemptType: auditContext.attemptType,
        decision: auditContext.decision,
        reason: auditContext.reason,
        security: auditContext.security,
      });
      next(error);
    }
  },
);

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Admin, Faculty
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        session: true,
      },
    });

    if (!attendance) {
      const error = new Error("Attendance record not found");
      error.statusCode = 404;
      throw error;
    }

    // For faculty, check if session belongs to them
    if (
      req.user.role === "faculty" &&
      attendance.session.facultyId !== req.user.id
    ) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const { status, notes, location } = req.body;

    const updatedAttendance = await prisma.attendance.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(status && { status }),
        ...(notes && { notes }),
        ...(location && { location }),
      },
      include: {
        student: { include: { studentProfile: true } },
        session: {
          include: {
            course: true,
            faculty: true,
            subject: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Attendance updated successfully",
      data: { attendance: updatedAttendance },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/attendance/:id
// @desc    Delete attendance record
// @access  Admin, Faculty
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["admin", "faculty"]),
  async (req, res, next) => {
    try {
      // Role check handled by requireRole middleware

      const attendance = await prisma.attendance.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
          session: true,
        },
      });

      if (!attendance) {
        const error = new Error("Attendance record not found");
        error.statusCode = 404;
        throw error;
      }

      // For faculty, check if session belongs to them
      if (
        req.user.role === "faculty" &&
        attendance.session.facultyId !== req.user.id
      ) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }

      await prisma.attendance.delete({
        where: { id: parseInt(req.params.id) },
      });

      // Update attendance count in session
      await prisma.session.update({
        where: { id: attendance.sessionId },
        data: {
          attendanceCount: { decrement: 1 },
        },
      });

      res.json({
        success: true,
        message: "Attendance deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
