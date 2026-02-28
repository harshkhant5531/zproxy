const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

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
          student: { include: { studentProfile: true } },
          session: {
            include: {
              course: true,
              faculty: true,
              subject: true,
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
      const isEnrolled = session.course.students.some(
        (student) => student.id === studentId,
      );

      if (!isEnrolled) {
        const error = new Error("Student is not enrolled in this course");
        error.statusCode = 400;
        throw error;
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

      // Create attendance record
      const attendance = await prisma.attendance.create({
        data: {
          sessionId,
          studentId,
          status: status || "present",
          notes,
          location: req.body.location,
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
router.delete("/:id", authMiddleware, async (req, res, next) => {
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
});

// @route   POST /api/attendance/qr
// @desc    Mark attendance using QR code
// @access  Student
router.post(
  "/qr",
  authMiddleware,
  [body("qrCode").notEmpty().withMessage("QR code is required")],
  async (req, res, next) => {
    try {
      if (req.user.role !== "student") {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }

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
              course: { include: { students: true } },
            },
          },
        },
      });

      if (!qrCodeData) {
        const error = new Error("Invalid or expired QR code");
        error.statusCode = 400;
        throw error;
      }

      // Check if QR code has reached maximum scans
      if (qrCodeData.scannedCount >= qrCodeData.maxScans) {
        const error = new Error("QR code has reached maximum scans");
        error.statusCode = 400;
        throw error;
      }

      // Check if student is enrolled in the course
      const isEnrolled = qrCodeData.session.course.students.some(
        (student) => student.id === req.user.id,
      );

      if (!isEnrolled) {
        const error = new Error("Student is not enrolled in this course");
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
        const error = new Error("Attendance already recorded");
        error.statusCode = 409;
        throw error;
      }

      // Create attendance record
      const attendance = await prisma.attendance.create({
        data: {
          sessionId: qrCodeData.sessionId,
          studentId: req.user.id,
          status: "present",
          location: req.body.location,
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
