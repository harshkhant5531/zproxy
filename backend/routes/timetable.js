const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/timetable
// @desc    Get timetable for user or all timetable entries (admin)
// @access  Admin, Faculty, Student
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const {
      courseId,
      facultyId,
      dayOfWeek,
      semester,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    if (courseId) where.courseId = parseInt(courseId);
    if (facultyId) where.facultyId = parseInt(facultyId);
    if (dayOfWeek) where.dayOfWeek = parseInt(dayOfWeek);
    if (semester) where.semester = parseInt(semester);

    // Filter based on user role
    if (req.user.role === "student") {
      where.course = {
        students: { some: { id: req.user.id } },
      };
    } else if (req.user.role === "faculty") {
      where.facultyId = req.user.id;
    }

    const skip = (page - 1) * limit;

    const [timetableEntries, total] = await Promise.all([
      prisma.timetable.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          course: true,
          subject: true,
          faculty: { include: { facultyProfile: true } },
        },
        orderBy: { dayOfWeek: "asc" },
      }),
      prisma.timetable.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        timetableEntries,
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

// @route   GET /api/timetable/:id
// @desc    Get timetable entry by ID
// @access  Admin, Faculty, Student
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const timetableEntry = await prisma.timetable.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        course: true,
        subject: true,
        faculty: { include: { facultyProfile: true } },
      },
    });

    if (!timetableEntry) {
      const error = new Error("Timetable entry not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access
    if (req.user.role === "student") {
      const course = await prisma.course.findUnique({
        where: { id: timetableEntry.courseId },
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
      data: { timetableEntry },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/timetable
// @desc    Create new timetable entry
// @access  Admin
router.post(
  "/",
  authMiddleware,
  [
    body("courseId").isInt().withMessage("Course ID is required"),
    body("subjectId").isInt().withMessage("Subject ID is required"),
    body("facultyId").isInt().withMessage("Faculty ID is required"),
    body("dayOfWeek")
      .isInt({ min: 0, max: 6 })
      .withMessage("Day of week must be between 0-6"),
    body("startTime").notEmpty().withMessage("Start time is required"),
    body("endTime").notEmpty().withMessage("End time is required"),
    body("roomNumber").notEmpty().withMessage("Room number is required"),
    body("semester")
      .isInt({ min: 1 })
      .withMessage("Semester must be at least 1"),
    body("type")
      .optional()
      .isIn(["Theory", "Practical", "Tutorial"])
      .withMessage("Invalid session type"),
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
        courseId,
        subjectId,
        facultyId,
        dayOfWeek,
        startTime,
        endTime,
        roomNumber,
        semester,
        type = "Theory",
      } = req.body;

      // Check if course and subject exist and are related
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
      });

      if (!subject || subject.courseId !== courseId) {
        const error = new Error("Subject is not associated with this course");
        error.statusCode = 400;
        throw error;
      }

      // Check if faculty is assigned to this course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (course.facultyId !== facultyId) {
        const error = new Error("Faculty is not assigned to this course");
        error.statusCode = 400;
        throw error;
      }

      // Check for time conflicts
      const conflictingEntries = await prisma.timetable.findMany({
        where: {
          OR: [
            {
              facultyId,
              dayOfWeek,
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
            {
              roomNumber,
              dayOfWeek,
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
          ],
        },
      });

      if (conflictingEntries.length > 0) {
        const error = new Error("Time conflict detected");
        error.statusCode = 409;
        throw error;
      }

      const timetableEntry = await prisma.timetable.create({
        data: {
          courseId,
          subjectId,
          facultyId,
          dayOfWeek,
          startTime,
          endTime,
          roomNumber,
          semester,
          type,
        },
        include: {
          course: true,
          subject: true,
          faculty: { include: { facultyProfile: true } },
        },
      });

      res.status(201).json({
        success: true,
        message: "Timetable entry created successfully",
        data: { timetableEntry },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/timetable/:id
// @desc    Update timetable entry
// @access  Admin
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const timetableEntry = await prisma.timetable.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!timetableEntry) {
      const error = new Error("Timetable entry not found");
      error.statusCode = 404;
      throw error;
    }

    const {
      courseId,
      subjectId,
      facultyId,
      dayOfWeek,
      startTime,
      endTime,
      roomNumber,
      semester,
      type,
    } = req.body;

    const updateData = {};

    if (courseId) updateData.courseId = courseId;
    if (subjectId) updateData.subjectId = subjectId;
    if (facultyId) updateData.facultyId = facultyId;
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (roomNumber) updateData.roomNumber = roomNumber;
    if (semester !== undefined) updateData.semester = semester;
    if (type) updateData.type = type;

    const updatedTimetableEntry = await prisma.timetable.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: {
        course: true,
        subject: true,
        faculty: { include: { facultyProfile: true } },
      },
    });

    res.json({
      success: true,
      message: "Timetable entry updated successfully",
      data: { timetableEntry: updatedTimetableEntry },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/timetable/:id
// @desc    Delete timetable entry
// @access  Admin
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const timetableEntry = await prisma.timetable.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!timetableEntry) {
      const error = new Error("Timetable entry not found");
      error.statusCode = 404;
      throw error;
    }

    await prisma.timetable.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({
      success: true,
      message: "Timetable entry deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/timetable/daily
// @desc    Get daily timetable for user
// @access  Faculty, Student
router.get("/daily", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const { date = new Date().toISOString().split("T")[0] } = req.query;
    const dayOfWeek = new Date(date).getDay();

    const where = { dayOfWeek };

    if (req.user.role === "student") {
      where.course = {
        students: { some: { id: req.user.id } },
      };
    } else if (req.user.role === "faculty") {
      where.facultyId = req.user.id;
    }

    const timetableEntries = await prisma.timetable.findMany({
      where,
      include: {
        course: true,
        subject: true,
        faculty: { include: { facultyProfile: true } },
      },
      orderBy: { startTime: "asc" },
    });

    res.json({
      success: true,
      data: {
        date,
        dayOfWeek,
        timetableEntries,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/timetable/weekly
// @desc    Get weekly timetable for user
// @access  Faculty, Student
router.get("/weekly", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const { weekStart = new Date().toISOString().split("T")[0] } = req.query;
    const weekStartDate = new Date(weekStart);

    const where = {};

    if (req.user.role === "student") {
      where.course = {
        students: { some: { id: req.user.id } },
      };
    } else if (req.user.role === "faculty") {
      where.facultyId = req.user.id;
    }

    const timetableEntries = await prisma.timetable.findMany({
      where,
      include: {
        course: true,
        subject: true,
        faculty: { include: { facultyProfile: true } },
      },
      orderBy: { dayOfWeek: "asc", startTime: "asc" },
    });

    // Group by day
    const weeklyTimetable = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      date: new Date(weekStartDate.getTime() + i * 24 * 60 * 60 * 1000),
      entries: [],
    }));

    timetableEntries.forEach((entry) => {
      weeklyTimetable[entry.dayOfWeek].entries.push(entry);
    });

    res.json({
      success: true,
      data: {
        weekStart: weekStartDate,
        weekEnd: new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000),
        weeklyTimetable,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
