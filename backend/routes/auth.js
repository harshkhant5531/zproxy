const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN },
  );
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post(
  "/register",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .isIn(["admin", "faculty", "student"])
      .withMessage("Invalid role"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("Validation Error");
        error.statusCode = 400;
        error.errors = errors.array();
        throw error;
      }

      const { username, email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await prisma.users.findFirst({
        where: {
          OR: [{ username }, { email }],
        },
      });

      if (existingUser) {
        const error = new Error("User already exists");
        error.statusCode = 409;
        throw error;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(
        password,
        parseInt(process.env.BCRYPT_SALT_ROUNDS),
      );

      // Create user
      const user = await prisma.users.create({
        data: {
          username,
          email,
          passwordHash,
          role,
        },
        include: {
          adminProfile: true,
          facultyProfile: true,
          studentProfile: true,
        },
      });

      // Generate token
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("Validation Error");
        error.statusCode = 400;
        error.errors = errors.array();
        throw error;
      }

      const { email, password } = req.body;
      console.log(`[AUTH] Login attempt for: ${email}`);

      // Find user
      const user = await prisma.users.findFirst({
        where: { email },
        include: {
          adminProfile: true,
          facultyProfile: true,
          studentProfile: true,
        },
      });

      if (!user) {
        console.log(`[AUTH] User not found: ${email}`);
        const error = new Error("Invalid credentials");
        error.statusCode = 401;
        throw error;
      }

      console.log(`[AUTH] User found: ${user.username}, Role: ${user.role}, Status: ${user.status}`);

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        console.log(`[AUTH] Password mismatch for: ${email}`);
        const error = new Error("Invalid credentials");
        error.statusCode = 401;
        throw error;
      }

      console.log(`[AUTH] Password verified for: ${email}`);

      // Check if user is active
      if (user.status !== "active") {
        console.log(`[AUTH] Account inactive for: ${email}`);
        const error = new Error("Your account is inactive or suspended");
        error.statusCode = 401;
        throw error;
      }

      // Generate token
      const token = generateToken(user);

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/auth/me
// @desc    Update current user profile
// @access  Private
router.put(
  "/me",
  authMiddleware,
  [
    body("username").optional().notEmpty().withMessage("Username is required"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("Validation Error");
        error.statusCode = 400;
        error.errors = errors.array();
        throw error;
      }

      const { username, email, avatar } = req.body;

      const updateData = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (avatar) updateData.avatar = avatar;

      const updatedUser = await prisma.users.update({
        where: { id: req.user.id },
        data: updateData,
        include: {
          adminProfile: true,
          facultyProfile: true,
          studentProfile: true,
        },
      });

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/auth/me/password
// @desc    Update password
// @access  Private
router.put(
  "/me/password",
  authMiddleware,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("Validation Error");
        error.statusCode = 400;
        error.errors = errors.array();
        throw error;
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        req.user.passwordHash,
      );
      if (!isPasswordValid) {
        const error = new Error("Current password is incorrect");
        error.statusCode = 400;
        throw error;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(
        newPassword,
        parseInt(process.env.BCRYPT_SALT_ROUNDS),
      );

      await prisma.users.update({
        where: { id: req.user.id },
        data: { passwordHash },
      });

      res.json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
