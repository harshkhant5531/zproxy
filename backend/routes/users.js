const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Admin
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    // Only admins can view all users
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const { role, status, page = 1, limit = 10, search } = req.query;

    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          adminProfile: true,
          facultyProfile: true,
          studentProfile: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.users.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
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

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Admin
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    // Only admins can view other users
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const user = await prisma.users.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        adminProfile: true,
        facultyProfile: true,
        studentProfile: true,
      },
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Admin
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    // Only admins can update users
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const { status, role } = req.body;

    const updatedUser = await prisma.users.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(status && { status }),
        ...(role && { role }),
      },
      include: {
        adminProfile: true,
        facultyProfile: true,
        studentProfile: true,
      },
    });

    res.json({
      success: true,
      message: "User updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Admin
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    // Only admins can delete users
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    // Prevent deleting self
    if (parseInt(req.params.id) === req.user.id) {
      const error = new Error("Cannot delete your own account");
      error.statusCode = 400;
      throw error;
    }

    await prisma.users.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/students
// @desc    Get all students
// @access  Admin, Faculty
router.get("/students", authMiddleware, async (req, res, next) => {
  try {
    // Only admins and faculty can view students
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const students = await prisma.users.findMany({
      where: { role: "student" },
      include: {
        studentProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { students },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/faculty
// @desc    Get all faculty
// @access  Admin
router.get("/faculty", authMiddleware, async (req, res, next) => {
  try {
    // Only admins can view faculty
    if (req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const faculty = await prisma.users.findMany({
      where: { role: "faculty" },
      include: {
        facultyProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { faculty },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/:id/profile
// @desc    Update user profile
// @access  Private
router.put("/:id/profile", authMiddleware, async (req, res, next) => {
  try {
    // Users can update their own profile
    if (parseInt(req.params.id) !== req.user.id && req.user.role !== "admin") {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const { fullName, phone, address, bio, ...profileData } = req.body;

    const user = await prisma.users.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // Update appropriate profile based on role
    if (user.role === "admin") {
      await prisma.adminProfile.upsert({
        where: { userId: user.id },
        update: { fullName, phone, address, bio },
        create: {
          userId: user.id,
          fullName,
          phone,
          address,
          bio,
        },
      });
    } else if (user.role === "faculty") {
      await prisma.facultyProfile.upsert({
        where: { userId: user.id },
        update: { fullName, phone, address, bio, ...profileData },
        create: {
          userId: user.id,
          fullName,
          phone,
          address,
          bio,
          ...profileData,
        },
      });
    } else if (user.role === "student") {
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: { fullName, phone, address, bio, ...profileData },
        create: {
          userId: user.id,
          fullName,
          phone,
          address,
          bio,
          ...profileData,
        },
      });
    }

    // Get updated user data
    const updatedUser = await prisma.users.findUnique({
      where: { id: user.id },
      include: {
        adminProfile: true,
        facultyProfile: true,
        studentProfile: true,
      },
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
