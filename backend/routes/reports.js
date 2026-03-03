const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");
const { requireRole } = authMiddleware;

const router = express.Router();

// @route   GET /api/reports/attendance
// @desc    Get attendance reports
// @access  Admin, Faculty
router.get("/attendance", authMiddleware, requireRole(["admin", "faculty", "student"]), async (req, res, next) => {
  try {
    const { courseId, studentId, batch, dateFrom, dateTo, status } = req.query;

    const where = {};

    // Force studentId for student role
    let targetStudentId = studentId ? parseInt(studentId) : undefined;
    if (req.user.role === "student") {
      targetStudentId = req.user.id;
    }

    if (courseId) {
      where.session = { ...where.session, courseId: parseInt(courseId) };
    }
    if (targetStudentId) where.studentId = targetStudentId;
    if (batch) {
      where.student = {
        studentProfile: {
          batch: batch
        }
      };
    }
    if (dateFrom && dateTo) {
      where.session = {
        ...where.session,
        date: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      };
    }
    if (status) where.status = status;

    // For faculty, show reports only for their courses
    if (req.user.role === "faculty") {
      where.session = {
        ...where.session,
        course: { facultyId: req.user.id },
      };
    }

    const reports = await prisma.attendance.findMany({
      where,
      include: {
        student: { include: { studentProfile: true } },
        session: {
          include: {
            course: true,
            subject: true,
            faculty: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    // Optimized statistics using aggregation
    const statistics = await prisma.attendance.aggregate({
      where,
      _count: {
        id: true,
      },
    });

    const statusCounts = await prisma.attendance.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true,
      },
    });

    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };

    statusCounts.forEach(c => {
      counts[c.status] = c._count.status;
    });

    const totalRecords = statistics._count.id;
    const attendanceRate = totalRecords > 0 ? (counts.present / totalRecords) * 100 : 0;

    res.json({
      success: true,
      data: {
        statistics: {
          totalRecords,
          presentCount: counts.present,
          absentCount: counts.absent,
          lateCount: counts.late,
          excusedCount: counts.excused,
          attendanceRate: parseFloat(attendanceRate.toFixed(2)),
        },
        reports,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/reports/grades
// @desc    Get grades reports
// @access  Admin, Faculty
router.get("/grades", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const { courseId, studentId, semester, year, grade } = req.query;

    const where = {};

    if (courseId) where.courseId = parseInt(courseId);
    if (studentId) where.studentId = parseInt(studentId);
    if (semester) where.semester = parseInt(semester);
    if (year) where.year = parseInt(year);
    if (grade) where.grade = grade;

    // For faculty, show reports only for their courses
    if (req.user.role === "faculty") {
      where.course = { facultyId: req.user.id };
    }

    const reports = await prisma.grade.findMany({
      where,
      include: {
        student: { include: { studentProfile: true } },
        course: true,
        subject: true,
      },
      orderBy: { year: "desc", semester: "desc", subjectId: "asc" },
    });

    // Calculate statistics
    const totalSubjects = reports.length;
    const totalMarksObtained = reports.reduce(
      (sum, r) => sum + r.marksObtained,
      0,
    );
    const totalMarks = reports.reduce((sum, r) => sum + r.totalMarks, 0);
    const averagePercentage =
      totalMarks > 0 ? (totalMarksObtained / totalMarks) * 100 : 0;

    // Grade distribution
    const gradeDistribution = {};
    reports.forEach((r) => {
      gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        statistics: {
          totalSubjects,
          totalMarksObtained,
          totalMarks,
          averagePercentage: parseFloat(averagePercentage.toFixed(2)),
          gradeDistribution,
        },
        reports,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/reports/leaves
// @desc    Get leave reports
// @access  Admin, Faculty
router.get("/leaves", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const { userId, leaveType, status, dateFrom, dateTo } = req.query;

    const where = {};

    if (userId) where.userId = parseInt(userId);
    if (leaveType) where.leaveType = leaveType;
    if (status) where.status = status;
    if (dateFrom && dateTo) {
      where.OR = [
        {
          startDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
        },
        {
          endDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
        },
      ];
    }

    // For faculty, show reports only for their students
    if (req.user.role === "faculty") {
      where.user = {
        role: "student",
        studentProfile: {
          department: { in: await getFacultyDepartments(req.user.id) },
        },
      };
    }

    const reports = await prisma.leaveApplication.findMany({
      where,
      include: {
        user: { include: { studentProfile: true } },
        approver: { include: { facultyProfile: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate statistics
    const totalApplications = reports.length;
    const approvedCount = reports.filter((r) => r.status === "approved").length;
    const rejectedCount = reports.filter((r) => r.status === "rejected").length;
    const pendingCount = reports.filter((r) => r.status === "pending").length;

    const approvalRate =
      totalApplications > 0 ? (approvedCount / totalApplications) * 100 : 0;

    // Leave type distribution
    const leaveTypeDistribution = {};
    reports.forEach((r) => {
      leaveTypeDistribution[r.leaveType] =
        (leaveTypeDistribution[r.leaveType] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        statistics: {
          totalApplications,
          approvedCount,
          rejectedCount,
          pendingCount,
          approvalRate: parseFloat(approvalRate.toFixed(2)),
          leaveTypeDistribution,
        },
        reports,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/reports/performance
// @desc    Get student performance reports
// @access  Admin, Faculty
router.get("/performance", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const { courseId, semester, year } = req.query;

    const where = {};

    if (courseId) where.courseId = parseInt(courseId);
    if (semester) where.semester = parseInt(semester);
    if (year) where.year = parseInt(year);

    // For faculty, show reports only for their courses
    if (req.user.role === "faculty") {
      where.course = { facultyId: req.user.id };
    }

    // Get all grades and total enrolled students
    const [grades, enrolledCourses] = await Promise.all([
      prisma.grade.findMany({
        where,
        include: {
          student: { include: { studentProfile: true } },
          course: true,
          subject: true,
        },
      }),
      prisma.course.findMany({
        where: req.user.role === "faculty" ? { facultyId: req.user.id } : (courseId ? { id: parseInt(courseId) } : {}),
        include: { students: true }
      })
    ]);

    const enrolledStudentIds = new Set(enrolledCourses.flatMap(c => c.students.map(s => s.id)));
    const totalEnrolledStudents = enrolledStudentIds.size;

    // Group grades by student
    const studentPerformance = {};
    grades.forEach((grade) => {
      if (!studentPerformance[grade.studentId]) {
        studentPerformance[grade.studentId] = {
          student: grade.student,
          grades: [],
        };
      }
      studentPerformance[grade.studentId].grades.push(grade);
    });

    // Calculate performance metrics for each student
    const performanceReports = Object.values(studentPerformance).map(
      (studentData) => {
        const totalMarksObtained = studentData.grades.reduce(
          (sum, g) => sum + g.marksObtained,
          0,
        );
        const totalMarks = studentData.grades.reduce(
          (sum, g) => sum + g.totalMarks,
          0,
        );
        const averagePercentage =
          totalMarks > 0 ? (totalMarksObtained / totalMarks) * 100 : 0;

        return {
          student: studentData.student,
          totalSubjects: studentData.grades.length,
          totalMarksObtained,
          totalMarks,
          averagePercentage: parseFloat(averagePercentage.toFixed(2)),
          grades: studentData.grades,
        };
      },
    );

    // Sort students by average percentage
    performanceReports.sort(
      (a, b) => b.averagePercentage - a.averagePercentage,
    );

    // Calculate class statistics
    const classAverage =
      performanceReports.length > 0
        ? performanceReports.reduce(
          (sum, student) => sum + student.averagePercentage,
          0,
        ) / performanceReports.length
        : 0;

    res.json({
      success: true,
      data: {
        statistics: {
          totalStudents: totalEnrolledStudents,
          gradedStudents: performanceReports.length,
          classAverage: parseFloat(classAverage.toFixed(2)),
        },
        students: performanceReports,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/reports/department
// @desc    Get department-wise reports
// @access  Admin
router.get("/department", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const { department, semester, year } = req.query;

    // Get all departments
    const departments = await prisma.course.findMany({
      where: department ? { department } : {},
      select: { department: true },
    });
    const uniqueDepartments = [
      ...new Set(departments.map((d) => d.department)),
    ];

    // Calculate department statistics
    const departmentReports = [];
    for (const dept of uniqueDepartments) {
      const courses = await prisma.course.findMany({
        where: { department: dept },
        include: {
          students: true,
          subjects: true,
          faculty: true,
        },
      });

      const totalCourses = courses.length;
      const totalStudents = [
        ...new Set(courses.flatMap((c) => c.students.map((s) => s.id))),
      ].length;
      const totalFaculty = [
        ...new Set(courses.flatMap((c) => (c.faculty ? [c.faculty.id] : []))),
      ].length;
      const totalSubjects = courses.flatMap((c) => c.subjects).length;

      // Calculate average attendance for department
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          session: {
            course: {
              department: dept,
              ...(semester && { semester: parseInt(semester) }),
            },
            ...(year && {
              date: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`),
              },
            }),
          },
        },
      });

      const attendanceRate =
        attendanceRecords.length > 0
          ? (attendanceRecords.filter((a) => a.status === "present").length /
            attendanceRecords.length) *
          100
          : 0;

      // Calculate average marks for department
      const grades = await prisma.grade.findMany({
        where: {
          course: { department: dept },
          ...(semester && { semester: parseInt(semester) }),
          ...(year && { year: parseInt(year) }),
        },
      });

      const averageMarks =
        grades.length > 0
          ? grades.reduce((sum, g) => sum + g.marksObtained, 0) / grades.length
          : 0;

      departmentReports.push({
        department: dept,
        totalCourses,
        totalStudents,
        totalFaculty,
        totalSubjects,
        averageAttendance: parseFloat(attendanceRate.toFixed(2)),
        averageMarks: parseFloat(averageMarks.toFixed(2)),
      });
    }

    res.json({
      success: true,
      data: {
        departments: departmentReports,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/reports
// @desc    Get all generated reports
// @access  Admin, Faculty
router.get("/", authMiddleware, requireRole(["admin", "faculty"]), async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === "faculty") {
      where.generatedById = req.user.id;
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        user: { include: { facultyProfile: true, adminProfile: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: { reports } });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/reports/generate
// @desc    Generate a new report
// @access  Admin, Faculty
router.post("/generate", authMiddleware, requireRole(["admin", "faculty"]), async (req, res, next) => {
  try {
    const { type, filters: reqFilters, format = "CSV" } = req.body;
    const fs = require("fs");
    const path = require("path");

    // Ensure reports directory exists
    const reportsDir = path.join(__dirname, "../generated/reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const fileName = `report_${type}_${Date.now()}.${format.toLowerCase()}`;
    const filePath = path.join(reportsDir, fileName);

    // Fetch data based on type
    let reportData = [];
    if (type === "attendance") {
      reportData = await prisma.attendance.findMany({
        where: reqFilters || {},
        include: { student: { include: { studentProfile: true } }, session: { include: { course: true } } }
      });
    } else if (type === "performance") {
      reportData = await prisma.grade.findMany({
        where: reqFilters || {},
        include: { student: { include: { studentProfile: true } }, course: true }
      });
    }

    // Basic CSV generation
    let content = "";
    if (reportData.length > 0) {
      const headers = Object.keys(reportData[0]).join(",");
      const rows = reportData.map(row =>
        Object.values(row).map(val =>
          typeof val === 'object' ? JSON.stringify(val).replace(/,/g, ';') : val
        ).join(",")
      );
      content = [headers, ...rows].join("\n");
    } else {
      content = "No data found for the selected filters.";
    }

    fs.writeFileSync(filePath, content);

    const report = await prisma.report.create({
      data: {
        reportType: type,
        filters: reqFilters || {},
        status: "completed",
        fileName: fileName,
        fileUrl: `/api/reports/download/${fileName}`,
        generatedBy: req.user.id
      }
    });

    res.status(201).json({ success: true, data: { report } });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/reports/download/:fileName
// @desc    Download report file
// @access  Admin, Faculty
router.get("/download/:fileName", authMiddleware, async (req, res, next) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(__dirname, "../generated/reports", req.params.fileName);

    if (!fs.existsSync(filePath)) {
      const error = new Error("File not found");
      error.statusCode = 404;
      throw error;
    }

    res.download(filePath);
  } catch (error) {
    next(error);
  }
});

// Helper function to get departments where faculty teaches
const getFacultyDepartments = async (facultyId) => {
  const courses = await prisma.course.findMany({
    where: { facultyId },
    select: { department: true },
  });
  return [...new Set(courses.map((course) => course.department))];
};

module.exports = router;
