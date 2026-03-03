const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/exams/permit
// @desc    Get exam permits for user or all permits (admin)
// @access  Admin, Faculty, Student
router.get("/permit", authMiddleware, async (req, res, next) => {
  try {
    const {
      studentId,
      courseId,
      examType,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    if (studentId) {
      where.studentId = parseInt(studentId);
    } else if (req.user.role === "student") {
      where.studentId = req.user.id;
    }

    if (courseId) where.courseId = parseInt(courseId);
    if (examType) where.examType = examType;
    if (status) where.status = status;

    // For faculty, show permits only for their courses
    if (req.user.role === "faculty") {
      where.course = { facultyId: req.user.id };
    }

    const skip = (page - 1) * limit;

    const [examPermits, total] = await Promise.all([
      prisma.examPermit.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          student: { include: { studentProfile: true } },
          course: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.examPermit.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        examPermits,
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

// @route   GET /api/exams/permit/:id
// @desc    Get exam permit by ID
// @access  Admin, Faculty, Student
router.get("/permit/:id", authMiddleware, async (req, res, next) => {
  try {
    const examPermit = await prisma.examPermit.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: { include: { studentProfile: true } },
        course: true,
      },
    });

    if (!examPermit) {
      const error = new Error("Exam permit not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access
    if (req.user.role === "student" && examPermit.studentId !== req.user.id) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    if (req.user.role === "faculty") {
      const course = await prisma.course.findUnique({
        where: { id: examPermit.courseId },
      });

      if (course.facultyId !== req.user.id) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    res.json({
      success: true,
      data: { examPermit },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/exams/permit
// @desc    Create exam permit
// @access  Admin, Faculty
router.post(
  "/permit",
  authMiddleware,
  [
    body("studentId").isInt().withMessage("Student ID is required"),
    body("courseId").isInt().withMessage("Course ID is required"),
    body("examType").notEmpty().withMessage("Exam type is required"),
    body("examDate").isISO8601().withMessage("Valid exam date is required"),
    body("examHall").notEmpty().withMessage("Exam hall is required"),
    body("seatNumber").notEmpty().withMessage("Seat number is required"),
    body("validFrom").isISO8601().withMessage("Valid from date is required"),
    body("validTo").isISO8601().withMessage("Valid to date is required"),
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
        studentId,
        courseId,
        examType,
        examDate,
        examHall,
        seatNumber,
        validFrom,
        validTo,
      } = req.body;

      // Check if student is enrolled in the course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: { students: true },
      });

      if (!course) {
        const error = new Error("Course not found");
        error.statusCode = 404;
        throw error;
      }

      const isEnrolled = course.students.some(
        (student) => student.id === studentId,
      );

      if (!isEnrolled) {
        const error = new Error("Student is not enrolled in this course");
        error.statusCode = 400;
        throw error;
      }

      // Check if student has an existing permit for this exam
      const existingPermit = await prisma.examPermit.findFirst({
        where: {
          studentId,
          courseId,
          examType,
          status: { in: ["pending", "approved"] },
        },
      });

      if (existingPermit) {
        const error = new Error(
          "Student already has an exam permit for this exam",
        );
        error.statusCode = 409;
        throw error;
      }

      // Generate QR code
      const qrCode = `exam_${studentId}_${courseId}_${examType}_${Date.now()}`;

      const examPermit = await prisma.examPermit.create({
        data: {
          studentId,
          courseId,
          examType,
          examDate: new Date(examDate),
          examHall,
          seatNumber,
          validFrom: new Date(validFrom),
          validTo: new Date(validTo),
          qrCode,
        },
        include: {
          student: { include: { studentProfile: true } },
          course: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Exam permit created successfully",
        data: { examPermit },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/exams/permit/:id
// @desc    Update exam permit
// @access  Admin, Faculty
router.put("/permit/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const examPermit = await prisma.examPermit.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!examPermit) {
      const error = new Error("Exam permit not found");
      error.statusCode = 404;
      throw error;
    }

    // For faculty, check if course belongs to them
    if (req.user.role === "faculty") {
      const course = await prisma.course.findUnique({
        where: { id: examPermit.courseId },
      });

      if (course.facultyId !== req.user.id) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    const {
      examType,
      examDate,
      examHall,
      seatNumber,
      validFrom,
      validTo,
      status,
      approvedBy,
    } = req.body;

    const updatedExamPermit = await prisma.examPermit.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(examType && { examType }),
        ...(examDate && { examDate: new Date(examDate) }),
        ...(examHall && { examHall }),
        ...(seatNumber && { seatNumber }),
        ...(validFrom && { validFrom: new Date(validFrom) }),
        ...(validTo && { validTo: new Date(validTo) }),
        ...(status && { status }),
        ...(approvedBy && { approvedBy }),
      },
      include: {
        student: { include: { studentProfile: true } },
        course: true,
      },
    });

    res.json({
      success: true,
      message: "Exam permit updated successfully",
      data: { examPermit: updatedExamPermit },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/exams/permit/:id
// @desc    Delete exam permit
// @access  Admin, Faculty
router.delete("/permit/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const examPermit = await prisma.examPermit.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!examPermit) {
      const error = new Error("Exam permit not found");
      error.statusCode = 404;
      throw error;
    }

    // For faculty, check if course belongs to them
    if (req.user.role === "faculty") {
      const course = await prisma.course.findUnique({
        where: { id: examPermit.courseId },
      });

      if (course.facultyId !== req.user.id) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    await prisma.examPermit.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({
      success: true,
      message: "Exam permit deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/exams/permit/:id/scan
// @desc    Scan exam permit QR code
// @access  Admin, Faculty
router.post("/permit/:id/scan", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const examPermit = await prisma.examPermit.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: { include: { studentProfile: true } },
        course: true,
      },
    });

    if (!examPermit) {
      const error = new Error("Exam permit not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if permit is valid and active
    if (examPermit.status !== "approved") {
      const error = new Error("Exam permit is not approved");
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();
    if (now < examPermit.validFrom || now > examPermit.validTo) {
      const error = new Error("Exam permit has expired or is not yet valid");
      error.statusCode = 400;
      throw error;
    }

    if (examPermit.scanned) {
      const error = new Error("Exam permit has already been scanned");
      error.statusCode = 400;
      throw error;
    }

    // Mark as scanned
    const updatedPermit = await prisma.examPermit.update({
      where: { id: parseInt(req.params.id) },
      data: { scanned: true },
      include: {
        student: { include: { studentProfile: true } },
        course: true,
      },
    });

    res.json({
      success: true,
      message: "Exam permit scanned successfully",
      data: { examPermit: updatedPermit },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/exams/permit/:id/download
// @desc    Download exam permit (hall ticket)
// @access  Admin, Faculty, Student
router.get("/permit/:id/download", authMiddleware, async (req, res, next) => {
  try {
    const permit = await prisma.examPermit.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: { include: { studentProfile: true } },
        course: true,
      },
    });

    if (!permit) {
      const error = new Error("Permit not found");
      error.statusCode = 404;
      throw error;
    }

    // Check access
    if (req.user.role === "student" && permit.studentId !== req.user.id) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const content = `
=========================================
      AURA INTEGRITY ENGINE - HALL TICKET
=========================================
STUENT NAME: ${permit.student.studentProfile.fullName}
ENROLLMENT: ${permit.student.studentProfile.enrollmentNumber}
COURSE: ${permit.course.name} (${permit.course.code})
EXAM TYPE: ${permit.examType.toUpperCase()}
DATE: ${permit.examDate.toDateString()}
HALL: ${permit.examHall}
SEAT: ${permit.seatNumber}
QR CODE: ${permit.qrCode}
=========================================
    VALID FROM: ${permit.validFrom.toDateString()}
    VALID TO:   ${permit.validTo.toDateString()}
=========================================
`;

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename=hall_ticket_${permit.id}.txt`);
    res.send(content);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
