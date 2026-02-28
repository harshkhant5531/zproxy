const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get notifications for user
// @access  Admin, Faculty, Student
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { type, priority, isRead, page = 1, limit = 10 } = req.query;

    const where = {};

    // For students and faculty, show their notifications
    if (req.user.role === "student" || req.user.role === "faculty") {
      where.OR = [
        { userId: req.user.id },
        { course: { students: { some: { id: req.user.id } } } },
      ];
    }

    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (isRead !== undefined) where.isRead = isRead === "true";

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: { include: { studentProfile: true, facultyProfile: true } },
          course: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
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

// @route   GET /api/notifications/:id
// @desc    Get notification by ID
// @access  Admin, Faculty, Student
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { include: { studentProfile: true, facultyProfile: true } },
        course: true,
      },
    });

    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access
    if (!notification.userId) {
      // Global notification - accessible to everyone
    } else if (notification.userId !== req.user.id) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    res.json({
      success: true,
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/notifications
// @desc    Create new notification
// @access  Admin
router.post(
  "/",
  authMiddleware,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("message").notEmpty().withMessage("Message is required"),
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

      const { title, message, type, priority, userId, courseId, scheduledAt } =
        req.body;

      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type: type || "info",
          priority: priority || "normal",
          ...(userId && { userId: parseInt(userId) }),
          ...(courseId && { courseId: parseInt(courseId) }),
          ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        },
        include: {
          user: { include: { studentProfile: true, facultyProfile: true } },
          course: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Notification created successfully",
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/notifications/:id
// @desc    Update notification
// @access  Admin
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      throw error;
    }

    const {
      title,
      message,
      type,
      priority,
      userId,
      courseId,
      scheduledAt,
      isRead,
    } = req.body;

    const updatedNotification = await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(title && { title }),
        ...(message && { message }),
        ...(type && { type }),
        ...(priority && { priority }),
        ...(userId && { userId: parseInt(userId) }),
        ...(courseId && { courseId: parseInt(courseId) }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(isRead !== undefined && { isRead }),
      },
      include: {
        user: { include: { studentProfile: true, facultyProfile: true } },
        course: true,
      },
    });

    res.json({
      success: true,
      message: "Notification updated successfully",
      data: { notification: updatedNotification },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Admin
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      throw error;
    }

    await prisma.notification.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Admin, Faculty, Student
router.put("/:id/read", authMiddleware, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if user has access
    if (!notification.userId) {
      // Global notification - accessible to everyone
    } else if (notification.userId !== req.user.id) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { isRead: true },
      include: {
        user: { include: { studentProfile: true, facultyProfile: true } },
        course: true,
      },
    });

    res.json({
      success: true,
      message: "Notification marked as read",
      data: { notification: updatedNotification },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Admin, Faculty, Student
router.put("/read-all", authMiddleware, async (req, res, next) => {
  try {
    const where = {};

    // For students and faculty, mark their notifications as read
    if (req.user.role === "student" || req.user.role === "faculty") {
      where.OR = [
        { userId: req.user.id },
        { course: { students: { some: { id: req.user.id } } } },
      ];
    }

    await prisma.notification.updateMany({
      where: {
        ...where,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/notifications/unread
// @desc    Get unread notification count
// @access  Admin, Faculty, Student
router.get("/unread", authMiddleware, async (req, res, next) => {
  try {
    const where = {};

    // For students and faculty, count their unread notifications
    if (req.user.role === "student" || req.user.role === "faculty") {
      where.OR = [
        { userId: req.user.id },
        { course: { students: { some: { id: req.user.id } } } },
      ];
    }

    where.isRead = false;

    const count = await prisma.notification.count({
      where,
    });

    res.json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
