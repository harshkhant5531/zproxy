const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");
const {
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS,
  resolveRadiusMeters,
} = require("../utils/geofence");
const { requireRole } = authMiddleware;

const router = express.Router();

// @route   GET /api/sessions
// @desc    Get all sessions
// @access  Admin, Faculty, Student (filtered by role)
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const {
      courseId,
      facultyId,
      status,
      date,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    // Filter based on user role
    if (req.user.role === "student") {
      where.course = {
        students: { some: { id: req.user.id } },
      };
    } else if (req.user.role === "faculty") {
      where.facultyId = req.user.id;
    }

    if (courseId) where.courseId = parseInt(courseId);
    if (facultyId) where.facultyId = parseInt(facultyId);
    if (status) where.status = status;
    if (date) where.date = new Date(date);

    // ─── Active sessions filter for student manual check-in ────────────────
    if (req.query.timetableOnly === "true" && req.user.role === "student") {
      const today = new Date();
      const startOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const endOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
      );

      // Show any of today's non-completed sessions for enrolled courses,
      // regardless of whether a timetable entry exists for today.
      where.date = { gte: startOfToday, lt: endOfToday };
      where.status = { not: "completed" };
    }

    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          course: {
            select: { id: true, name: true, code: true },
          },
          faculty: {
            select: {
              id: true,
              username: true,
              facultyProfile: { select: { fullName: true } },
            },
          },
          subject: {
            select: { id: true, name: true },
          },
          qrCodes: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          // attendanceRecords removed from list for performance
        },
        orderBy: { date: "desc" },
      }),
      prisma.session.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          ...s,
          qrCode: s.qrCodes?.[0] || null,
        })),
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

// @route   GET /api/sessions/:id
// @desc    Get session by ID
// @access  Admin, Faculty, Student
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        course: {
          include: {
            students: {
              include: { studentProfile: true },
            },
          },
        },
        faculty: true,
        subject: true,
        qrCodes: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        attendanceRecords: true,
      },
    });

    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    // Optimized access checks by role
    if (req.user.role === "student") {
      const isEnrolled = await prisma.course.findFirst({
        where: {
          id: session.courseId,
          students: { some: { id: req.user.id } },
        },
        select: { id: true },
      });

      if (!isEnrolled) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    if (req.user.role === "faculty") {
      const isCreator = session.facultyId === req.user.id;
      const course = await prisma.course.findUnique({
        where: { id: session.courseId },
        select: { facultyId: true },
      });
      const isCourseLead = course?.facultyId === req.user.id;

      if (!isCreator && !isCourseLead) {
        const error = new Error(
          "Forbidden: You are not authorized to access this session",
        );
        error.statusCode = 403;
        throw error;
      }
    }

    const { getLocalIp } = require("../utils/network");
    res.json({
      success: true,
      data: {
        session: {
          ...session,
          qrCode: session.qrCodes?.[0] || null,
        },
        networkIp: getLocalIp(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/sessions
// @desc    Create new session
// @access  Admin, Faculty
router.post(
  "/",
  authMiddleware,
  requireRole(["admin", "faculty"]),
  [
    body("courseId").isInt().withMessage("Course ID is required"),
    body("topic").notEmpty().withMessage("Topic is required"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("startTime").notEmpty().withMessage("Start time is required"),
    body("endTime").notEmpty().withMessage("End time is required"),
    body("geofenceRadius")
      .optional()
      .isInt({ min: MIN_RADIUS_METERS, max: MAX_RADIUS_METERS })
      .withMessage(
        `Radius must be between ${MIN_RADIUS_METERS}m and ${MAX_RADIUS_METERS}m`,
      ),
    body("facultyLat").optional().isFloat().withMessage("Invalid latitude"),
    body("facultyLng").optional().isFloat().withMessage("Invalid longitude"),
  ],
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

      const {
        courseId,
        subjectId,
        topic,
        description,
        sessionType,
        date,
        startTime,
        endTime,
        duration,
        status,
        batches,
        geofenceRadius,
        facultyLat,
        facultyLng,
      } = req.body;

      // Check if faculty has access to this course or specialized subject
      if (req.user.role === "faculty") {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          include: {
            subjects: subjectId ? { where: { id: subjectId } } : false,
          },
        });

        if (!course) {
          const error = new Error("Course not found");
          error.statusCode = 404;
          throw error;
        }

        const isCourseLead = course.facultyId === req.user.id;
        const isSubjectTeacher =
          subjectId && course.subjects.some((s) => s.facultyId === req.user.id);

        if (!isCourseLead && !isSubjectTeacher) {
          const error = new Error(
            "Forbidden: You are not authorized to create a session for this course/subject",
          );
          error.statusCode = 403;
          throw error;
        }
      }

      const session = await prisma.session.create({
        data: {
          courseId,
          ...(subjectId && { subjectId }),
          facultyId: req.user.id,
          topic,
          description,
          sessionType: sessionType || "lecture",
          date: new Date(date),
          startTime,
          endTime,
          duration: duration || 60,
          status: status || "scheduled",
          batches: batches || [],
          geofenceRadius: resolveRadiusMeters({ geofenceRadius }),
          facultyLat: facultyLat ? parseFloat(facultyLat) : null,
          facultyLng: facultyLng ? parseFloat(facultyLng) : null,
        },
        include: {
          course: { select: { id: true, name: true, code: true } },
          faculty: {
            select: {
              id: true,
              username: true,
              facultyProfile: { select: { fullName: true } },
            },
          },
          subject: { select: { id: true, name: true } },
          qrCodes: true,
          // New session has 0 records, no need to include
        },
      });

      res.status(201).json({
        success: true,
        message: "Session created successfully",
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/sessions/:id
// @desc    Update session
// @access  Admin, Faculty
router.put(
  "/:id",
  authMiddleware,
  [
    body("geofenceRadius")
      .optional()
      .isInt({ min: MIN_RADIUS_METERS, max: MAX_RADIUS_METERS })
      .withMessage(
        `Radius must be between ${MIN_RADIUS_METERS}m and ${MAX_RADIUS_METERS}m`,
      ),
    body("facultyLat").optional().isFloat().withMessage("Invalid latitude"),
    body("facultyLng").optional().isFloat().withMessage("Invalid longitude"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("Validation Error");
        error.statusCode = 400;
        error.errors = errors.array();
        throw error;
      }

      const session = await prisma.session.findUnique({
        where: { id: parseInt(req.params.id) },
      });

      if (!session) {
        const error = new Error("Session not found");
        error.statusCode = 404;
        throw error;
      }

      // Check if user has access to update this session (Creator or Course Lead)
      if (req.user.role === "faculty") {
        const isCreator = session.facultyId === req.user.id;
        const course = await prisma.course.findUnique({
          where: { id: session.courseId },
          select: { facultyId: true },
        });
        const isCourseLead = course?.facultyId === req.user.id;

        if (!isCreator && !isCourseLead) {
          const error = new Error(
            "Forbidden: You are not authorized to update this session",
          );
          error.statusCode = 403;
          throw error;
        }
      }

      const {
        courseId,
        subjectId,
        topic,
        description,
        sessionType,
        date,
        startTime,
        endTime,
        duration,
        status,
        batches,
        geofenceRadius,
        facultyLat,
        facultyLng,
      } = req.body;

      const updatedSession = await prisma.session.update({
        where: { id: parseInt(req.params.id) },
        data: {
          ...(courseId && { courseId }),
          ...(subjectId && { subjectId }),
          ...(topic && { topic }),
          ...(description && { description }),
          ...(sessionType && { sessionType }),
          ...(date && { date: new Date(date) }),
          ...(startTime && { startTime }),
          ...(endTime && { endTime }),
          ...(duration && { duration }),
          ...(status && { status }),
          ...(batches && { batches }),
          ...(geofenceRadius !== undefined && {
            geofenceRadius: resolveRadiusMeters({ geofenceRadius }),
          }),
          ...(facultyLat !== undefined && {
            facultyLat: facultyLat === null ? null : parseFloat(facultyLat),
          }),
          ...(facultyLng !== undefined && {
            facultyLng: facultyLng === null ? null : parseFloat(facultyLng),
          }),
        },
        include: {
          course: true,
          faculty: true,
          subject: true,
          qrCode: true,
          attendanceRecords: true,
        },
      });

      res.json({
        success: true,
        message: "Session updated successfully",
        data: { session: updatedSession },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   DELETE /api/sessions/:id
// @desc    Delete session
// @access  Admin, Faculty
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access to delete this session (Creator or Course Lead)
    if (req.user.role === "faculty") {
      const isCreator = session.facultyId === req.user.id;
      const course = await prisma.course.findUnique({
        where: { id: session.courseId },
        select: { facultyId: true },
      });
      const isCourseLead = course?.facultyId === req.user.id;

      if (!isCreator && !isCourseLead) {
        const error = new Error(
          "Forbidden: You are not authorized to delete this session",
        );
        error.statusCode = 403;
        throw error;
      }
    }

    await prisma.session.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/sessions/:id/qr
// @desc    Generate QR code for session
// @access  Admin, Faculty
router.post(
  "/:id/qr",
  authMiddleware,
  requireRole(["admin", "faculty"]),
  async (req, res, next) => {
    try {
      const session = await prisma.session.findUnique({
        where: { id: parseInt(req.params.id) },
      });

      if (!session) {
        const error = new Error("Session not found");
        error.statusCode = 404;
        throw error;
      }

      // Check if user has access (Creator or Course Lead)
      if (req.user.role === "faculty") {
        const isCreator = session.facultyId === req.user.id;
        const course = await prisma.course.findUnique({
          where: { id: session.courseId },
          select: { facultyId: true },
        });
        const isCourseLead = course?.facultyId === req.user.id;

        if (!isCreator && !isCourseLead) {
          const error = new Error(
            "Forbidden: You are not authorized to generate QR for this session",
          );
          error.statusCode = 403;
          throw error;
        }
      }

      // Generate a new QR code (Keep history for grace period)
      const qrCode = await prisma.qrCode.create({
        data: {
          sessionId: session.id,
          codeValue: `session_${session.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          validFrom: new Date(Date.now() - 5000), // 5s back-dated to handle clock skew
          validTo: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes life
          scannedCount: 0,
          maxScans: 100, // Increased for larger classes
        },
      });

      // Optional: Cleanup old codes for this session that are older than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await prisma.qrCode
        .deleteMany({
          where: {
            sessionId: session.id,
            createdAt: { lt: fiveMinutesAgo },
          },
        })
        .catch((e) => console.error("QR Cleanup Error:", e));

      res.json({
        success: true,
        message: "QR code generated successfully",
        data: { qrCode },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   POST /api/sessions/:id/finalize
// @desc    Mark session as completed and auto-mark absentees (with leave check)
// @access  Admin, Faculty
router.post(
  "/:id/finalize",
  authMiddleware,
  requireRole(["admin", "faculty"]),
  async (req, res, next) => {
    try {
      const sessionId = parseInt(req.params.id);

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          course: {
            include: {
              students: { include: { studentProfile: true } },
            },
          },
          attendanceRecords: {
            select: { id: true, studentId: true, status: true, notes: true },
          },
        },
      });

      if (!session) {
        const error = new Error("Session not found");
        error.statusCode = 404;
        throw error;
      }

      if (req.user.role === "faculty") {
        const isCreator = session.facultyId === req.user.id;
        if (!isCreator && session.course.facultyId !== req.user.id) {
          const error = new Error("Forbidden");
          error.statusCode = 403;
          throw error;
        }
      }

      // Mark session completed
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "completed" },
      });

      // Determine eligible students (batch-restricted or all enrolled)
      const allStudents = session.course.students;
      const eligibleStudents =
        session.batches && session.batches.length > 0
          ? allStudents.filter((s) =>
              session.batches.includes(s.studentProfile?.batch),
            )
          : allStudents;

      const eligibleIds = new Set(eligibleStudents.map((s) => s.id));

      // Proxy-suspect present records are converted to absent at finalization.
      const proxyPresentRecords = session.attendanceRecords.filter(
        (r) =>
          r.status === "present" &&
          r.notes?.includes("[PROXY_SUSPECT") &&
          eligibleIds.has(r.studentId),
      );
      if (proxyPresentRecords.length > 0) {
        await Promise.all(
          proxyPresentRecords.map((r) =>
            prisma.attendance.update({
              where: { id: r.id },
              data: {
                status: "absent",
                notes: `${r.notes || ""} [AUTO_ABSENT:PROXY_SUSPECT]`.trim(),
              },
            }),
          ),
        );
      }

      const proxyMarkedIds = new Set(
        proxyPresentRecords.map((r) => r.studentId),
      );
      const recordedIds = new Set(
        session.attendanceRecords.map((r) => r.studentId),
      );
      const absentees = eligibleStudents.filter(
        (s) => !recordedIds.has(s.id) && !proxyMarkedIds.has(s.id),
      );

      if (absentees.length === 0 && proxyPresentRecords.length === 0) {
        return res.json({
          success: true,
          message: "Session finalized. All eligible students are present.",
          data: { markedAbsent: 0, excusedAbsent: 0, proxyAbsent: 0 },
        });
      }

      // Check for approved leaves covering the session date
      const sessionDate = new Date(session.date);
      const absenteeIds = absentees.map((s) => s.id);

      const approvedLeaves = await prisma.leaveApplication.findMany({
        where: {
          userId: { in: absenteeIds },
          status: "approved",
          startDate: { lte: sessionDate },
          endDate: { gte: sessionDate },
        },
        select: { userId: true },
      });

      const leaveStudentIds = new Set(approvedLeaves.map((l) => l.userId));

      let markedAbsent = proxyPresentRecords.length;
      let excusedAbsent = 0;

      const absentRecords = absentees.map((s) => {
        const hasLeave = leaveStudentIds.has(s.id);
        if (hasLeave) excusedAbsent++;
        else markedAbsent++;
        return {
          sessionId,
          studentId: s.id,
          status: "absent",
          notes: hasLeave ? "Excused – Approved Leave" : "Auto-marked absent",
          ipAddress: req.ip,
        };
      });

      await prisma.attendance.createMany({
        data: absentRecords,
        skipDuplicates: true,
      });

      // Update session status to completed
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "completed" },
      });

      res.json({
        success: true,
        message: `Session finalized. ${markedAbsent} marked absent, ${excusedAbsent} excused.`,
        data: {
          markedAbsent,
          excusedAbsent,
          proxyAbsent: proxyPresentRecords.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/sessions/:id/attendance
// @desc    Get session attendance
// @access  Admin, Faculty, Student
router.get("/:id/attendance", authMiddleware, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access
    if (req.user.role === "student") {
      const course = await prisma.course.findUnique({
        where: { id: session.courseId },
        include: { students: true },
      });

      const hasAccess = course.students.some(
        (student) => student.id === req.user.id,
      );
      if (!hasAccess) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    const attendance = await prisma.attendance.findMany({
      where: { sessionId: session.id },
      include: {
        student: { include: { studentProfile: true } },
      },
    });

    res.json({
      success: true,
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
