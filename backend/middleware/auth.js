const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided, authorization denied",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        adminProfile: true,
        facultyProfile: true,
        studentProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Token is not valid",
      });
    }

    // Check if user is active
    if (user.status !== "active") {
      return res.status(401).json({
        message: "Your account is inactive or suspended",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      message: "Token is not valid",
    });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden. You do not have access to this resource.",
      });
    }
    next();
  };
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
