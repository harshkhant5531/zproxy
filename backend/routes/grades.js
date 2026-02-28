const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/grades
// @desc    Get grades for user or all grades (admin/faculty)
// @access  Admin, Faculty, Student
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const {
      studentId,
      courseId,
      subjectId,
      semester,
      year,
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
    if (subjectId) where.subjectId = parseInt(subjectId);
    if (semester) where.semester = parseInt(semester);
    if (year) where.year = parseInt(year);

    // For faculty, show grades only for their courses
    if (req.user.role === "faculty") {
      where.course = { facultyId: req.user.id };
    }

    const skip = (page - 1) * limit;

    const [grades, total] = await Promise.all([
      prisma.grade.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          student: { include: { studentProfile: true } },
          course: true,
          subject: true,
        },
        orderBy: { semester: "desc", year: "desc" },
      }),
      prisma.grade.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        grades,
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

// @route   GET /api/grades/:id
// @desc    Get grade by ID
// @access  Admin, Faculty, Student
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const grade = await prisma.grade.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: { include: { studentProfile: true } },
        course: true,
        subject: true,
      },
    });

    if (!grade) {
      const error = new Error("Grade not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access
    if (req.user.role === "student" && grade.studentId !== req.user.id) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    if (req.user.role === "faculty") {
      const course = await prisma.course.findUnique({
        where: { id: grade.courseId },
      });

      if (course.facultyId !== req.user.id) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    res.json({
      success: true,
      data: { grade },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/grades
// @desc    Create new grade
// @access  Admin, Faculty
router.post(
  "/",
  authMiddleware,
  [
    body("studentId").isInt().withMessage("Student ID is required"),
    body("courseId").isInt().withMessage("Course ID is required"),
    body("subjectId").isInt().withMessage("Subject ID is required"),
    body("marksObtained")
      .isInt({ min: 0 })
      .withMessage("Marks must be a non-negative integer"),
    body("totalMarks")
      .isInt({ min: 1 })
      .withMessage("Total marks must be at least 1"),
    body("grade").notEmpty().withMessage("Grade is required"),
    body("semester")
      .isInt({ min: 1 })
      .withMessage("Semester must be at least 1"),
    body("year")
      .isInt({ min: 2000, max: 2100 })
      .withMessage("Year must be between 2000-2100"),
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
        subjectId,
        assignment,
        marksObtained,
        totalMarks,
        grade,
        semester,
        year,
        teacherRemarks,
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

      // Check if subject is part of the course
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
      });

      if (!subject || subject.courseId !== courseId) {
        const error = new Error("Subject is not part of this course");
        error.statusCode = 400;
        throw error;
      }

      // Check if grade already exists
      const existingGrade = await prisma.grade.findFirst({
        where: {
          studentId,
          courseId,
          subjectId,
          semester,
          year,
          ...(assignment && { assignment }),
        },
      });

      if (existingGrade) {
        const error = new Error("Grade already exists");
        error.statusCode = 409;
        throw error;
      }

      // Validate marks
      if (marksObtained > totalMarks) {
        const error = new Error("Marks obtained cannot exceed total marks");
        error.statusCode = 400;
        throw error;
      }

      const gradeEntry = await prisma.grade.create({
        data: {
          studentId,
          courseId,
          subjectId,
          assignment,
          marksObtained,
          totalMarks,
          grade,
          semester,
          year,
          teacherRemarks,
        },
        include: {
          student: { include: { studentProfile: true } },
          course: true,
          subject: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Grade created successfully",
        data: { grade: gradeEntry },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/grades/:id
// @desc    Update grade
// @access  Admin, Faculty
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const grade = await prisma.grade.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!grade) {
      const error = new Error("Grade not found");
      error.statusCode = 404;
      throw error;
    }

    // For faculty, check if course belongs to them
    if (req.user.role === "faculty") {
      const course = await prisma.course.findUnique({
        where: { id: grade.courseId },
      });

      if (course.facultyId !== req.user.id) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    const {
      studentId,
      courseId,
      subjectId,
      assignment,
      marksObtained,
      totalMarks,
      grade: gradeValue,
      semester,
      year,
      teacherRemarks,
    } = req.body;

    const updateData = {};

    if (studentId) updateData.studentId = studentId;
    if (courseId) updateData.courseId = courseId;
    if (subjectId) updateData.subjectId = subjectId;
    if (assignment) updateData.assignment = assignment;
    if (marksObtained !== undefined) updateData.marksObtained = marksObtained;
    if (totalMarks) updateData.totalMarks = totalMarks;
    if (gradeValue) updateData.grade = gradeValue;
    if (semester) updateData.semester = semester;
    if (year) updateData.year = year;
    if (teacherRemarks) updateData.teacherRemarks = teacherRemarks;

    // Validate marks if updated
    if (marksObtained !== undefined && totalMarks) {
      if (marksObtained > totalMarks) {
        const error = new Error("Marks obtained cannot exceed total marks");
        error.statusCode = 400;
        throw error;
      }
    } else if (marksObtained !== undefined) {
      const currentTotal = totalMarks || grade.totalMarks;
      if (marksObtained > currentTotal) {
        const error = new Error("Marks obtained cannot exceed total marks");
        error.statusCode = 400;
        throw error;
      }
    }

    const updatedGrade = await prisma.grade.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: {
        student: { include: { studentProfile: true } },
        course: true,
        subject: true,
      },
    });

    res.json({
      success: true,
      message: "Grade updated successfully",
      data: { grade: updatedGrade },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/grades/:id
// @desc    Delete grade
// @access  Admin, Faculty
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const grade = await prisma.grade.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!grade) {
      const error = new Error("Grade not found");
      error.statusCode = 404;
      throw error;
    }

    // For faculty, check if course belongs to them
    if (req.user.role === "faculty") {
      const course = await prisma.course.findUnique({
        where: { id: grade.courseId },
      });

      if (course.facultyId !== req.user.id) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    await prisma.grade.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({
      success: true,
      message: "Grade deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/grades/report
// @desc    Get student grade report
// @access  Student, Admin, Faculty
router.get("/report", authMiddleware, async (req, res, next) => {
  try {
    const { studentId, semester, year } = req.query;

    // Determine which student's report to show
    let targetStudentId = req.user.id;
    if (studentId) {
      targetStudentId = parseInt(studentId);

      // Check if user has access to view other student's report
      if (req.user.role !== "admin" && req.user.role !== "faculty") {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    } else if (req.user.role === "admin" || req.user.role === "faculty") {
      const error = new Error("Student ID is required");
      error.statusCode = 400;
      throw error;
    }

    const where = { studentId: targetStudentId };
    if (semester) where.semester = parseInt(semester);
    if (year) where.year = parseInt(year);

    const grades = await prisma.grade.findMany({
      where,
      include: {
        course: true,
        subject: true,
      },
      orderBy: { semester: "asc", year: "asc", subjectId: "asc" },
    });

    // Calculate statistics
    const totalSubjects = grades.length;
    const totalMarksObtained = grades.reduce(
      (sum, grade) => sum + grade.marksObtained,
      0,
    );
    const totalMarks = grades.reduce((sum, grade) => sum + grade.totalMarks, 0);
    const averagePercentage =
      totalMarks > 0 ? (totalMarksObtained / totalMarks) * 100 : 0;

    // Group grades by semester and year
    const groupedGrades = {};
    grades.forEach((grade) => {
      const key = `${grade.year}_${grade.semester}`;
      if (!groupedGrades[key]) {
        groupedGrades[key] = {
          year: grade.year,
          semester: grade.semester,
          grades: [],
        };
      }
      groupedGrades[key].grades.push(grade);
    });

    res.json({
      success: true,
      data: {
        studentId: targetStudentId,
        totalSubjects,
        totalMarksObtained,
        totalMarks,
        averagePercentage: parseFloat(averagePercentage.toFixed(2)),
        groupedGrades: Object.values(groupedGrades),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
