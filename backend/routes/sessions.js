const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

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

    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          course: true,
          faculty: true,
          subject: true,
          qrCode: true,
          attendanceRecords: true,
        },
        orderBy: { date: "desc" },
      }),
      prisma.session.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        sessions,
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
        course: true,
        faculty: true,
        subject: true,
        qrCode: true,
        attendanceRecords: true,
      },
    });

    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if student has access to this session
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

    res.json({
      success: true,
      data: { session },
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
  [
    body("courseId").isInt().withMessage("Course ID is required"),
    body("topic").notEmpty().withMessage("Topic is required"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("startTime").notEmpty().withMessage("Start time is required"),
    body("endTime").notEmpty().withMessage("End time is required"),
  ],
  async (req, res, next) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "faculty") {
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
      } = req.body;

      // Check if faculty has access to this course
      if (req.user.role === "faculty") {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
        });

        if (!course || course.facultyId !== req.user.id) {
          const error = new Error("Forbidden");
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
        },
        include: {
          course: true,
          faculty: true,
          subject: true,
          qrCode: true,
          attendanceRecords: true,
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
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access to update this session
    if (req.user.role === "faculty" && session.facultyId !== req.user.id) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
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
});

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

    // Check if user has access to delete this session
    if (req.user.role === "faculty" && session.facultyId !== req.user.id) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
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
router.post("/:id/qr", authMiddleware, async (req, res, next) => {
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
    if (req.user.role === "faculty" && session.facultyId !== req.user.id) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    // Generate QR code
    const qrCode = await prisma.qrCode.upsert({
      where: { sessionId: session.id },
      update: {
        codeValue: `session_${session.id}_${Date.now()}`,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        scannedCount: 0,
        maxScans: 50,
      },
      create: {
        sessionId: session.id,
        codeValue: `session_${session.id}_${Date.now()}`,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        scannedCount: 0,
        maxScans: 50,
      },
    });

    res.json({
      success: true,
      message: "QR code generated successfully",
      data: { qrCode },
    });
  } catch (error) {
    next(error);
  }
});

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
