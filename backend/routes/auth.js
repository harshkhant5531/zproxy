const express = require("express");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { OAuth2Client } = require("google-auth-library");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const GOOGLE_ALLOWED_DOMAIN = (
  process.env.GOOGLE_ALLOWED_DOMAIN || "darshan.ac.in"
).toLowerCase();

const buildUsernameBase = (email, name) => {
  const fromEmail = (email || "").split("@")[0].toLowerCase();
  const fromName = (name || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return (fromEmail || fromName || `google_user_${Date.now()}`).slice(0, 30);
};

const makeUniqueUsername = async (base) => {
  let candidate = base;
  let attempt = 0;
  while (true) {
    const existing = await prisma.users.findFirst({
      where: { username: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    attempt += 1;
    candidate = `${base}_${attempt}`.slice(0, 30);
  }
};

const makeUniqueEnrollment = async (base) => {
  let candidate = base;
  let attempt = 0;
  while (true) {
    const existing = await prisma.studentProfile.findFirst({
      where: { enrollmentNumber: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    attempt += 1;
    candidate = `${base}${attempt}`.slice(0, 32);
  }
};

const RESET_PASSWORD_EXPIRES_IN =
  process.env.RESET_PASSWORD_EXPIRES_IN || "15m";

const DEFAULT_PASSWORD_BY_ROLE = {
  admin: "admin123",
  faculty: "faculty123",
  student: "student123",
};

const getFrontendUrl = (req) => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const origin = req.get("origin");
  if (origin) return origin;
  return "http://localhost:8080";
};

const isDefaultPassword = async (passwordHash, role) => {
  try {
    const preferredDefault = DEFAULT_PASSWORD_BY_ROLE[role];
    if (preferredDefault && (await argon2.verify(passwordHash, preferredDefault))) {
      return true;
    }

    // Backward compatibility for users migrated between role defaults.
    for (const candidate of Object.values(DEFAULT_PASSWORD_BY_ROLE)) {
      if (candidate === preferredDefault) continue;
      if (await argon2.verify(passwordHash, candidate)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
};

const serializeUser = async (user) => {
  const requiresPasswordChange = await isDefaultPassword(
    user.passwordHash,
    user.role,
  );
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    adminProfile: user.adminProfile || null,
    facultyProfile: user.facultyProfile || null,
    studentProfile: user.studentProfile || null,
    requiresPasswordChange,
  };
};

const generateResetPasswordToken = (user) =>
  jwt.sign(
    { userId: user.id, purpose: "password-reset" },
    process.env.JWT_SECRET,
    { expiresIn: RESET_PASSWORD_EXPIRES_IN },
  );

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
      const passwordHash = await argon2.hash(password);

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
          user: await serializeUser(user),
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

      const emailRaw = req.body.email;
      const email =
        typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
      const { password } = req.body;
      console.log(`[AUTH] Login attempt for: ${email}`);

      if (!email) {
        const error = new Error("Please provide a valid email");
        error.statusCode = 400;
        throw error;
      }

      // Find user
      const user = await prisma.users.findFirst({
        where: {
          email: { equals: email },
        },
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

      console.log(
        `[AUTH] User found: ${user.username}, Role: ${user.role}, Status: ${user.status}`,
      );

      // Check password
      const isPasswordValid = await argon2.verify(user.passwordHash, password);
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
          user: await serializeUser(user),
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   POST /api/auth/google
// @desc    Login existing user using Google ID token
// @access  Public
router.post(
  "/google",
  [body("idToken").notEmpty().withMessage("Google ID token is required")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("Validation Error");
        error.statusCode = 400;
        error.errors = errors.array();
        throw error;
      }

      if (!process.env.GOOGLE_CLIENT_ID) {
        const error = new Error(
          "Google Sign-In is not configured on the server",
        );
        error.statusCode = 500;
        throw error;
      }

      const { idToken } = req.body;
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload?.email || !payload.email_verified) {
        const error = new Error("Google account email is not verified");
        error.statusCode = 401;
        throw error;
      }

      const normalizedEmail = payload.email.toLowerCase();
      const [, domain = ""] = normalizedEmail.split("@");
      if (domain !== GOOGLE_ALLOWED_DOMAIN) {
        const error = new Error(
          `Only @${GOOGLE_ALLOWED_DOMAIN} Google accounts are allowed`,
        );
        error.statusCode = 403;
        throw error;
      }

      let user = await prisma.users.findFirst({
        where: { email: normalizedEmail },
        include: {
          adminProfile: true,
          facultyProfile: true,
          studentProfile: true,
        },
      });

      if (!user) {
        // Controlled auto-provision for first-time institutional Google users.
        const usernameBase = buildUsernameBase(normalizedEmail, payload.name);
        const username = await makeUniqueUsername(usernameBase);
        const enrollmentBase = normalizedEmail
          .split("@")[0]
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase()
          .slice(0, 24);
        const enrollmentNumber = await makeUniqueEnrollment(
          enrollmentBase || `GS${Date.now()}`,
        );
        const passwordHash = await argon2.hash(
          `${process.env.JWT_SECRET || "google"}_${Date.now()}_${Math.random()}`,
        );

        user = await prisma.users.create({
          data: {
            username,
            email: normalizedEmail,
            passwordHash,
            role: "student",
            status: "active",
            avatar: payload.picture || null,
            studentProfile: {
              create: {
                fullName: payload.name || username,
                enrollmentNumber,
                department: "Computer Science",
              },
            },
          },
          include: {
            adminProfile: true,
            facultyProfile: true,
            studentProfile: true,
          },
        });
      }

      if (user.status !== "active") {
        const error = new Error("Your account is inactive or suspended");
        error.statusCode = 401;
        throw error;
      }

      // Keep avatar fresh from Google profile when available.
      if (payload.picture && user.avatar !== payload.picture) {
        await prisma.users.update({
          where: { id: user.id },
          data: { avatar: payload.picture },
        });
      }

      const token = generateToken(user);
      const serializedUser = await serializeUser({
        ...user,
        avatar: payload.picture || user.avatar,
      });
      res.json({
        success: true,
        message: "Google login successful",
        data: {
          user: serializedUser,
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
        user: await serializeUser(req.user),
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

      const {
        username,
        email,
        avatar,
        fullName,
        phone,
        address,
        bio,
        department,
        designation,
        qualification,
        officeHours,
        parentPhone,
        parentEmail,
      } = req.body;

      const updateData = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (avatar) updateData.avatar = avatar;

      if (req.user.role === "student") {
        updateData.studentProfile = {
          upsert: {
            update: {
              ...(fullName && { fullName }),
              ...(phone && { phone }),
              ...(address && { address }),
              ...(bio && { bio }),
              ...(department && { department }),
              ...(parentPhone && { parentPhone }),
              ...(parentEmail && { parentEmail }),
            },
            create: {
              fullName:
                fullName ||
                req.user.studentProfile?.fullName ||
                req.user.username,
              phone,
              address,
              bio,
              department,
              parentPhone,
              parentEmail,
              enrollmentNumber:
                req.user.studentProfile?.enrollmentNumber ||
                `${req.user.username.toUpperCase()}_AUTO`,
            },
          },
        };
      }

      if (req.user.role === "faculty") {
        updateData.facultyProfile = {
          upsert: {
            update: {
              ...(fullName && { fullName }),
              ...(phone && { phone }),
              ...(address && { address }),
              ...(bio && { bio }),
              ...(department && { department }),
              ...(designation && { designation }),
              ...(qualification && { qualification }),
              ...(officeHours && { officeHours }),
            },
            create: {
              fullName:
                fullName ||
                req.user.facultyProfile?.fullName ||
                req.user.username,
              phone,
              address,
              bio,
              department,
              designation,
              qualification,
              officeHours,
              employeeId:
                req.user.facultyProfile?.employeeId || `FAC-${req.user.id}`,
            },
          },
        };
      }

      if (req.user.role === "admin") {
        updateData.adminProfile = {
          upsert: {
            update: {
              ...(fullName && { fullName }),
              ...(phone && { phone }),
              ...(address && { address }),
              ...(bio && { bio }),
            },
            create: {
              fullName:
                fullName ||
                req.user.adminProfile?.fullName ||
                req.user.username,
              phone,
              address,
              bio,
            },
          },
        };
      }

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
          user: await serializeUser(updatedUser),
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

      // Google-provisioned users have a random hash they can never know.
      // Detect them by checking if the stored hash doesn't match ANY known
      // default, AND the user was created via Google (avatar from Google).
      const isGoogleUser =
        req.user.avatar &&
        req.user.avatar.includes("googleusercontent.com");

      if (!isGoogleUser) {
        // Verify current password for non-Google users
        let isPasswordValid = await argon2.verify(
          req.user.passwordHash,
          currentPassword,
        );

        // Fallback: also accept role-based default passwords
        if (!isPasswordValid) {
          const defaults = Object.values(DEFAULT_PASSWORD_BY_ROLE);
          for (const def of defaults) {
            if (currentPassword === def && await argon2.verify(req.user.passwordHash, def)) {
              isPasswordValid = true;
              break;
            }
          }
        }

        if (!isPasswordValid) {
          const error = new Error("Current password is incorrect");
          error.statusCode = 400;
          throw error;
        }
      }

      // Hash new password
      const passwordHash = await argon2.hash(newPassword);

      await prisma.users.update({
        where: { id: req.user.id },
        data: { passwordHash },
      });

      res.json({
        success: true,
        message: "Password updated successfully",
        data: {
          requiresPasswordChange: false,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   POST /api/auth/forgot-password
// @desc    Create a password reset link for a user
// @access  Public
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Please provide a valid email")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("Validation Error");
        error.statusCode = 400;
        error.errors = errors.array();
        throw error;
      }

      const email = req.body.email.toLowerCase();
      const user = await prisma.users.findFirst({
        where: { email, status: "active" },
        include: {
          adminProfile: true,
          facultyProfile: true,
          studentProfile: true,
        },
      });

      if (!user) {
        return res.json({
          success: true,
          message:
            "If the account exists, a password reset link has been generated.",
        });
      }

      const resetToken = generateResetPasswordToken(user);
      const frontendUrl = getFrontendUrl(req);
      const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

      res.json({
        success: true,
        message: "Password reset link generated successfully.",
        data: {
          resetToken,
          resetUrl,
          expiresIn: RESET_PASSWORD_EXPIRES_IN,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   POST /api/auth/reset-password
// @desc    Reset password using a reset token
// @access  Public
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
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

      const { token, newPassword } = req.body;
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        const error = new Error("Reset link is invalid or expired");
        error.statusCode = 400;
        throw error;
      }

      if (decoded.purpose !== "password-reset") {
        const error = new Error("Reset link is invalid or expired");
        error.statusCode = 400;
        throw error;
      }

      const user = await prisma.users.findUnique({
        where: { id: decoded.userId },
      });
      if (!user || user.status !== "active") {
        const error = new Error("User account is unavailable");
        error.statusCode = 404;
        throw error;
      }

      const passwordHash = await argon2.hash(newPassword);
      await prisma.users.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
