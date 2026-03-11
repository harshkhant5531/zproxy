const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");
const { requireRole } = authMiddleware;

const router = express.Router();

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

      // 🛡️ Geofencing Validation (Faculty-Student Proximity) - For students only
      if (req.user.role === "student") {
        const { lat, lng } = req.body;
        const geolib = require("geolib");

        const REFERENCE_LOCATION = {
          latitude: session.facultyLat || parseFloat(process.env.CAMPUS_LAT) || 23.0225,
          longitude: session.facultyLng || parseFloat(process.env.CAMPUS_LNG) || 72.5714
        };
        const RADIUS = session.geofenceRadius || parseInt(process.env.CAMPUS_RADIUS) || 25;

        if (lat && lng) {
          const distance = geolib.getDistance(
            { latitude: lat, longitude: lng },
            REFERENCE_LOCATION
          );

          if (distance > RADIUS) {
            const error = new Error(`Spatial Protocol Violation: You are ${distance}m away from the instructor. Verification requires proximity to the classroom grid.`);
            error.statusCode = 403;
            throw error;
          }
        } else {
          const error = new Error("Spatial Authentication Required: Enable GPS to verify presence.");
          error.statusCode = 400;
          throw error;
        }
      }

      // ─── Proxy Detection ────────────────────────────────────────────────
      let finalStatus = status || "present";
      let finalNotes = notes || null;
      if (req.ip && req.user.role === "student") {
        const sameIpRecord = await prisma.attendance.findFirst({
          where: {
            sessionId,
            studentId: { not: studentId },
            ipAddress: req.ip,
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
          location: req.body.lat && req.body.lng ? `${req.body.lat},${req.body.lng}` : req.body.location,
          ipAddress: req.ip,
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

      // 🛡️ Geofencing Validation (Faculty-Student Proximity)
      const { lat, lng } = req.body;
      const geolib = require("geolib");

      // Use faculty location if available, else fallback to campus grid
      const REFERENCE_LOCATION = {
        latitude: qrCodeData.session.facultyLat || parseFloat(process.env.CAMPUS_LAT) || 23.0225,
        longitude: qrCodeData.session.facultyLng || parseFloat(process.env.CAMPUS_LNG) || 72.5714
      };
      const RADIUS = qrCodeData.session.geofenceRadius || parseInt(process.env.CAMPUS_RADIUS) || 25;

      if (lat && lng) {
        const distance = geolib.getDistance(
          { latitude: lat, longitude: lng },
          REFERENCE_LOCATION
        );

        if (distance > RADIUS) {
          const error = new Error(`Spatial Protocol Violation: You are ${distance}m away from the instructor. Verification requires proximity to the classroom grid.`);
          error.statusCode = 403;
          throw error;
        }
      } else {
        // Force location if geofencing is strictly required
        const error = new Error("Spatial Authentication Required: Enable GPS to verify presence.");
        error.statusCode = 400;
        throw error;
      }

      // Check if attendance already exists
      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          sessionId: qrCodeData.sessionId,
          studentId: req.user.id,
        },
      });

      if (existingAttendance) {
        const error = new Error("Neural Link Active: Attendance already recorded.");
        error.statusCode = 409;
        throw error;
      }

      // ─── Proxy Detection ────────────────────────────────────────────────
      let status = "present";
      let qrNotes = null;

      if (req.ip) {
        const sameIpRecord = await prisma.attendance.findFirst({
          where: {
            sessionId: qrCodeData.sessionId,
            studentId: { not: req.user.id },
            ipAddress: req.ip,
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
          ipAddress: req.ip,
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
