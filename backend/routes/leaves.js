const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/leaves
// @desc    Get leave applications for user or all applications (admin/faculty)
// @access  Admin, Faculty, Student
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { userId, leaveType, status, page = 1, limit = 10 } = req.query;

    const where = {};

    if (userId) {
      where.userId = parseInt(userId);
    } else if (req.user.role === "student") {
      where.userId = req.user.id;
    }

    if (leaveType) where.leaveType = leaveType;
    if (status) where.status = status;

    // For faculty, show applications from their students
    if (req.user.role === "faculty") {
      where.user = {
        role: "student",
        studentProfile: {
          department: { in: await getFacultyDepartments(req.user.id) },
        },
      };
    }

    const skip = (page - 1) * limit;

    const [leaveApplications, total] = await Promise.all([
      prisma.leaveApplication.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: { include: { studentProfile: true } },
          approver: { include: { facultyProfile: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.leaveApplication.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        leaveApplications,
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

// Helper function to get departments where faculty teaches
const getFacultyDepartments = async (facultyId) => {
  const courses = await prisma.course.findMany({
    where: { facultyId },
    select: { department: true },
  });
  return [...new Set(courses.map((course) => course.department))];
};

// @route   GET /api/leaves/:id
// @desc    Get leave application by ID
// @access  Admin, Faculty, Student
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const leaveApplication = await prisma.leaveApplication.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { include: { studentProfile: true } },
        approver: { include: { facultyProfile: true } },
      },
    });

    if (!leaveApplication) {
      const error = new Error("Leave application not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access
    if (
      req.user.role === "student" &&
      leaveApplication.userId !== req.user.id
    ) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    if (req.user.role === "faculty") {
      const departments = await getFacultyDepartments(req.user.id);
      const isStudentInDepartment = departments.includes(
        leaveApplication.user.studentProfile.department,
      );

      if (!isStudentInDepartment) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    res.json({
      success: true,
      data: { leaveApplication },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/leaves
// @desc    Create new leave application
// @access  Student
router.post(
  "/",
  authMiddleware,
  [
    body("leaveType").notEmpty().withMessage("Leave type is required"),
    body("startDate").isISO8601().withMessage("Valid start date is required"),
    body("endDate").isISO8601().withMessage("Valid end date is required"),
    body("reason").notEmpty().withMessage("Reason for leave is required"),
  ],
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

      const { leaveType, startDate, endDate, reason, supportingDocument } =
        req.body;

      // Check date validity
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        const error = new Error("Start date cannot be after end date");
        error.statusCode = 400;
        throw error;
      }

      if (start < new Date()) {
        const error = new Error("Start date cannot be in the past");
        error.statusCode = 400;
        throw error;
      }

      const leaveApplication = await prisma.leaveApplication.create({
        data: {
          userId: req.user.id,
          leaveType,
          startDate: start,
          endDate: end,
          reason,
          supportingDocument,
        },
        include: {
          user: { include: { studentProfile: true } },
          approver: { include: { facultyProfile: true } },
        },
      });

      res.status(201).json({
        success: true,
        message: "Leave application created successfully",
        data: { leaveApplication },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/leaves/:id
// @desc    Update leave application
// @access  Student, Admin, Faculty
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    const leaveApplication = await prisma.leaveApplication.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!leaveApplication) {
      const error = new Error("Leave application not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access
    if (
      req.user.role === "student" &&
      leaveApplication.userId !== req.user.id
    ) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    if (req.user.role === "faculty" && leaveApplication.status !== "pending") {
      const error = new Error("Cannot update a processed leave application");
      error.statusCode = 400;
      throw error;
    }

    const {
      leaveType,
      startDate,
      endDate,
      reason,
      supportingDocument,
      status,
      approvalNotes,
    } = req.body;

    const updateData = {};

    if (req.user.role === "student" && leaveApplication.status === "pending") {
      // Students can only update pending applications
      if (leaveType) updateData.leaveType = leaveType;
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (reason) updateData.reason = reason;
      if (supportingDocument)
        updateData.supportingDocument = supportingDocument;
    } else if (req.user.role === "admin" || req.user.role === "faculty") {
      // Admin/faculty can process applications
      if (status) {
        updateData.status = status;
        if (status !== "pending") {
          updateData.approvedBy = req.user.id;
          if (approvalNotes) {
            updateData.approvalNotes = approvalNotes;
          }
        }
      }
    } else {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const updatedApplication = await prisma.leaveApplication.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: {
        user: { include: { studentProfile: true } },
        approver: { include: { facultyProfile: true } },
      },
    });

    res.json({
      success: true,
      message: "Leave application updated successfully",
      data: { leaveApplication: updatedApplication },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/leaves/:id
// @desc    Delete leave application
// @access  Student, Admin
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    const leaveApplication = await prisma.leaveApplication.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!leaveApplication) {
      const error = new Error("Leave application not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access
    if (req.user.role === "student") {
      if (
        leaveApplication.userId !== req.user.id ||
        leaveApplication.status !== "pending"
      ) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    } else if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    await prisma.leaveApplication.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({
      success: true,
      message: "Leave application deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/leaves/:id/approve
// @desc    Approve leave application
// @access  Admin, Faculty
router.post("/:id/approve", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const leaveApplication = await prisma.leaveApplication.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { include: { studentProfile: true } },
      },
    });

    if (!leaveApplication) {
      const error = new Error("Leave application not found");
      error.statusCode = 404;
      throw error;
    }

    if (leaveApplication.status !== "pending") {
      const error = new Error("Leave application is already processed");
      error.statusCode = 400;
      throw error;
    }

    // For faculty, check if student is in their department
    if (req.user.role === "faculty") {
      const departments = await getFacultyDepartments(req.user.id);
      const isStudentInDepartment = departments.includes(
        leaveApplication.user.studentProfile.department,
      );

      if (!isStudentInDepartment) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    const updatedApplication = await prisma.leaveApplication.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: "approved",
        approvedBy: req.user.id,
        approvalNotes: req.body.approvalNotes,
      },
      include: {
        user: { include: { studentProfile: true } },
        approver: { include: { facultyProfile: true } },
      },
    });

    res.json({
      success: true,
      message: "Leave application approved successfully",
      data: { leaveApplication: updatedApplication },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/leaves/:id/reject
// @desc    Reject leave application
// @access  Admin, Faculty
router.post("/:id/reject", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const leaveApplication = await prisma.leaveApplication.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { include: { studentProfile: true } },
      },
    });

    if (!leaveApplication) {
      const error = new Error("Leave application not found");
      error.statusCode = 404;
      throw error;
    }

    if (leaveApplication.status !== "pending") {
      const error = new Error("Leave application is already processed");
      error.statusCode = 400;
      throw error;
    }

    // For faculty, check if student is in their department
    if (req.user.role === "faculty") {
      const departments = await getFacultyDepartments(req.user.id);
      const isStudentInDepartment = departments.includes(
        leaveApplication.user.studentProfile.department,
      );

      if (!isStudentInDepartment) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    const updatedApplication = await prisma.leaveApplication.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: "rejected",
        approvedBy: req.user.id,
        approvalNotes: req.body.approvalNotes,
      },
      include: {
        user: { include: { studentProfile: true } },
        approver: { include: { facultyProfile: true } },
      },
    });

    res.json({
      success: true,
      message: "Leave application rejected successfully",
      data: { leaveApplication: updatedApplication },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
