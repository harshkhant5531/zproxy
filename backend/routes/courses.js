const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/courses
// @desc    Get all courses
// @access  Admin, Faculty, Student
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const {
      department,
      semester,
      status,
      page = 1,
      limit = 10,
      search,
    } = req.query;

    const where = {};
    if (department) where.department = department;
    if (semester) where.semester = parseInt(semester);
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          faculty: true,
          subjects: true,
          students: { include: { studentProfile: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.course.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        courses,
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

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Admin, Faculty, Student
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        faculty: true,
        subjects: true,
        students: { include: { studentProfile: true } },
        timetableEntries: true,
      },
    });

    if (!course) {
      const error = new Error("Course not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      success: true,
      data: { course },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/courses
// @desc    Create new course
// @access  Admin
router.post(
  "/",
  authMiddleware,
  [
    body("code").notEmpty().withMessage("Course code is required"),
    body("name").notEmpty().withMessage("Course name is required"),
    body("department").notEmpty().withMessage("Department is required"),
    body("credits").isInt({ min: 1 }).withMessage("Credits must be at least 1"),
    body("semester")
      .isInt({ min: 1 })
      .withMessage("Semester must be at least 1"),
  ],
  async (req, res, next) => {
    try {
      if (req.user.role !== "admin") {
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
        code,
        name,
        description,
        department,
        credits,
        semester,
        facultyId,
        status,
      } = req.body;

      // Check if course code already exists
      const existingCourse = await prisma.course.findUnique({
        where: { code },
      });

      if (existingCourse) {
        const error = new Error("Course code already exists");
        error.statusCode = 409;
        throw error;
      }

      const course = await prisma.course.create({
        data: {
          code,
          name,
          description,
          department,
          credits,
          semester,
          ...(facultyId && { facultyId }),
          ...(status && { status }),
        },
        include: {
          faculty: true,
          subjects: true,
          students: { include: { studentProfile: true } },
        },
      });

      res.status(201).json({
        success: true,
        message: "Course created successfully",
        data: { course },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Admin
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const {
      code,
      name,
      description,
      department,
      credits,
      semester,
      facultyId,
      status,
    } = req.body;

    const updatedCourse = await prisma.course.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(description && { description }),
        ...(department && { department }),
        ...(credits && { credits }),
        ...(semester && { semester }),
        ...(facultyId && { facultyId }),
        ...(status && { status }),
      },
      include: {
        faculty: true,
        subjects: true,
        students: { include: { studentProfile: true } },
      },
    });

    res.json({
      success: true,
      message: "Course updated successfully",
      data: { course: updatedCourse },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Admin
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    await prisma.course.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/courses/:id/subjects
// @desc    Get course subjects
// @access  Admin, Faculty, Student
router.get("/:id/subjects", authMiddleware, async (req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { courseId: parseInt(req.params.id) },
      include: {
        course: true,
      },
    });

    res.json({
      success: true,
      data: { subjects },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/courses/:id/subjects
// @desc    Create subject for course
// @access  Admin
router.post(
  "/:id/subjects",
  authMiddleware,
  [
    body("name").notEmpty().withMessage("Subject name is required"),
    body("credits").isInt({ min: 1 }).withMessage("Credits must be at least 1"),
  ],
  async (req, res, next) => {
    try {
      if (req.user.role !== "admin") {
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

      const { name, description, credits, totalClasses } = req.body;

      const subject = await prisma.subject.create({
        data: {
          courseId: parseInt(req.params.id),
          name,
          description,
          credits,
          totalClasses: totalClasses || 0,
        },
        include: {
          course: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Subject created successfully",
        data: { subject },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/courses/:courseId/subjects/:subjectId
// @desc    Update subject
// @access  Admin
router.put(
  "/:courseId/subjects/:subjectId",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user.role !== "admin") {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }

      const { name, description, credits, totalClasses } = req.body;

      const updatedSubject = await prisma.subject.update({
        where: { id: parseInt(req.params.subjectId) },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(credits && { credits }),
          ...(totalClasses && { totalClasses }),
        },
        include: {
          course: true,
        },
      });

      res.json({
        success: true,
        message: "Subject updated successfully",
        data: { subject: updatedSubject },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   DELETE /api/courses/:courseId/subjects/:subjectId
// @desc    Delete subject
// @access  Admin
router.delete(
  "/:courseId/subjects/:subjectId",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user.role !== "admin") {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }

      await prisma.subject.delete({
        where: { id: parseInt(req.params.subjectId) },
      });

      res.json({
        success: true,
        message: "Subject deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/courses/:id/students
// @desc    Get course students
// @access  Admin, Faculty
router.get("/:id/students", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const course = await prisma.course.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        students: { include: { studentProfile: true } },
      },
    });

    if (!course) {
      const error = new Error("Course not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      success: true,
      data: { students: course.students },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
