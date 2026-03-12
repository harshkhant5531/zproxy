const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");
const { validateStudentGeofence } = require("../utils/geofence");
const { requireRole } = authMiddleware;

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

      // Calculate student risk profiles with anomaly scoring
      const studentRiskProfiles = Array.from(studentRiskMap.values())
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
        .sort((a, b) => b.anomalyScore - a.anomalyScore)
        .slice(0, 25);

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
      const detectionAccuracy =
        allTotalCount > 0
          ? Math.round((allFlaggedCount / allTotalCount) * 100)
          : 0;

      const flaggedRecords = records.map((row) => {
        const note = row.notes || "";
        let riskScore = 25;
        if (note.includes("[PROXY_DETECTED")) riskScore += 50;
        if (note.includes("[PROXY_SUSPECT")) riskScore += 35;
        if (note.includes("[AUTO_ABSENT:PROXY")) riskScore += 20;
        if (row.status === "absent") riskScore += 10;
        riskScore = Math.min(100, riskScore);

        return {
          ...row,
          riskScore,
          riskLabel:
            riskScore >= 80
              ? "critical"
              : riskScore >= 60
                ? "high"
                : riskScore >= 40
                  ? "moderate"
                  : "low",
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
              detectionAccuracy,
              uniqueStudentsAtRisk: studentRiskProfiles.length,
              criticalRiskCount: studentRiskProfiles.filter(
                (s) => s.riskLevel === "critical",
              ).length,
              highRiskCount: studentRiskProfiles.filter(
                (s) => s.riskLevel === "high",
              ).length,
              moderateRiskCount: studentRiskProfiles.filter(
                (s) => s.riskLevel === "moderate",
              ).length,
              lowRiskCount: studentRiskProfiles.filter(
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
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("Validation Error");
        error.statusCode = 400;
        error.errors = errors.array();
        throw error;
      }

      const { sessionId, status, notes } = req.body;

      // Find session
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          course: { include: { students: true } },
        },
      });

      if (!session) {
        const error = new Error("Session not found");
        error.statusCode = 404;
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

      // Check if student is enrolled in the course
      const isEnrolledInCourse = session.course.students.some(
        (student) => student.id === studentId,
      );

      if (!isEnrolledInCourse) {
        const error = new Error("Student is not enrolled in this course");
        error.statusCode = 400;
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
            throw error;
          }
        }
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
        throw error;
      }

      // Enforce faculty-centered geofence for student attendance.
      if (req.user.role === "student") {
        validateStudentGeofence(
          session,
          req.body.lat,
          req.body.lng,
          req.body.accuracy,
        );
      }

      // ─── Proxy Detection ────────────────────────────────────────────────
      let finalStatus = status || "present";
      let finalNotes = notes || null;
      const clientIp = getClientIp(req);
      if (clientIp && req.user.role === "student") {
        const sameIpRecord = await prisma.attendance.findFirst({
          where: {
            sessionId,
            studentId: { not: studentId },
            ipAddress: clientIp,
          },
          select: { id: true, studentId: true, notes: true },
        });

        if (sameIpRecord) {
          finalStatus = "absent";
          finalNotes = `[PROXY_SUSPECT:sharedWith:${sameIpRecord.studentId}]${notes ? " " + notes : ""}`;

          // Retroactively penalize previous record
          await prisma.attendance.update({
            where: { id: sameIpRecord.id },
            data: {
              status: "absent",
              notes: `[PROXY_SUSPECT:sharedWith:${studentId}]${sameIpRecord.notes ? " " + sameIpRecord.notes : ""}`,
            },
          });
        }
      }

      // Create attendance record
      const attendance = await prisma.attendance.create({
        data: {
          sessionId,
          studentId,
          status: finalStatus,
          notes: finalNotes,
          location:
            req.body.lat && req.body.lng
              ? `${req.body.lat},${req.body.lng}`
              : req.body.location,
          ipAddress: clientIp,
          deviceInfo: req.body.deviceInfo,
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

      res.status(201).json({
        success: true,
        message: "Attendance recorded successfully",
        data: { attendance },
      });
    } catch (error) {
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

// @route   POST /api/attendance/qr
// @desc    Mark attendance using QR code
// @access  Student
router.post(
  "/qr",
  authMiddleware,
  requireRole(["student"]),
  [body("qrCode").notEmpty().withMessage("QR code is required")],
  async (req, res, next) => {
    try {
      // Role check handled by requireRole middleware

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("Validation Error");
        error.statusCode = 400;
        error.errors = errors.array();
        throw error;
      }

      const { qrCode } = req.body;

      // Find QR code
      const qrCodeData = await prisma.qrCode.findFirst({
        where: {
          codeValue: qrCode,
          validFrom: { lte: new Date() },
          validTo: { gte: new Date() },
        },
        include: {
          session: {
            include: {
              course: {
                select: {
                  id: true,
                  students: {
                    where: { id: req.user.id },
                    select: {
                      id: true,
                      studentProfile: { select: { batch: true } },
                      studentSubjects: { select: { id: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!qrCodeData) {
        const error = new Error("Invalid or expired QR code");
        error.statusCode = 400;
        throw error;
      }

      // Combined enrollment check
      const studentData = qrCodeData.session.course.students[0];
      if (!studentData) {
        const error = new Error("Student is not enrolled in this course");
        error.statusCode = 400;
        throw error;
      }

      if (qrCodeData.session.subjectId) {
        const isEnrolledInSubject = (studentData.studentSubjects || []).some(
          (s) => s.id === qrCodeData.session.subjectId,
        );

        if (!isEnrolledInSubject) {
          const error = new Error("Student is not enrolled in this subject");
          error.statusCode = 400;
          throw error;
        }
      }

      // 🛡️ Batch-Wise Access Control
      const sessionBatches = qrCodeData.session.batches || [];
      const studentBatch = studentData.studentProfile?.batch;

      if (
        sessionBatches.length > 0 &&
        (!studentBatch || !sessionBatches.includes(studentBatch))
      ) {
        const error = new Error(
          `Protocol Violation: This session is locked to BATCHES [${sessionBatches.join(", ")}]. Authorized batch access only.`,
        );
        error.statusCode = 403;
        throw error;
      }

      const { lat, lng } = req.body;
      validateStudentGeofence(qrCodeData.session, lat, lng, req.body.accuracy);

      // Check if attendance already exists
      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          sessionId: qrCodeData.sessionId,
          studentId: req.user.id,
        },
      });

      if (existingAttendance) {
        const error = new Error(
          "Neural Link Active: Attendance already recorded.",
        );
        error.statusCode = 409;
        throw error;
      }

      // ─── Proxy Detection ────────────────────────────────────────────────
      let status = "present";
      let qrNotes = null;
      const clientIp = getClientIp(req);

      if (clientIp) {
        const sameIpRecord = await prisma.attendance.findFirst({
          where: {
            sessionId: qrCodeData.sessionId,
            studentId: { not: req.user.id },
            ipAddress: clientIp,
          },
        });

        if (sameIpRecord) {
          // PROXY DETECTED: Mark both as ABSENT
          status = "absent";
          qrNotes = `[PROXY_DETECTED:sharedWith:${sameIpRecord.studentId}] Duplicate IP authentication attempt.`;

          await prisma.attendance.update({
            where: { id: sameIpRecord.id },
            data: {
              status: "absent",
              notes: `[PROXY_DETECTED:sharedWith:${req.user.id}]${sameIpRecord.notes ? " " + sameIpRecord.notes : ""}`,
            },
          });
        }
      }

      // Create valid attendance record
      const attendance = await prisma.attendance.create({
        data: {
          sessionId: qrCodeData.sessionId,
          studentId: req.user.id,
          status: status,
          notes: qrNotes,
          location: `${lat},${lng}`,
          ipAddress: clientIp,
          deviceInfo: req.body.deviceInfo,
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

      // Update QR code scanned count
      await prisma.qrCode.update({
        where: { id: qrCodeData.id },
        data: { scannedCount: { increment: 1 } },
      });

      // Update attendance count in session
      await prisma.session.update({
        where: { id: qrCodeData.sessionId },
        data: { attendanceCount: { increment: 1 } },
      });

      res.json({
        success: true,
        message: "Attendance recorded successfully using QR code",
        data: { attendance },
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
