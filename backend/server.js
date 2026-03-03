const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables FIRST before requiring modules that depend on them
dotenv.config();

const prisma = require("./prisma");
const authMiddleware = require("./middleware/auth");
const errorHandler = require("./middleware/error");


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:8080").split(",");
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const courseRoutes = require("./routes/courses");
const sessionRoutes = require("./routes/sessions");
const attendanceRoutes = require("./routes/attendance");
const examRoutes = require("./routes/exams");
const leaveRoutes = require("./routes/leaves");
const timetableRoutes = require("./routes/timetable");
const gradeRoutes = require("./routes/grades");
const reportRoutes = require("./routes/reports");
const notificationRoutes = require("./routes/notifications");

// Public routes
app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/courses", authMiddleware, courseRoutes);
app.use("/api/sessions", authMiddleware, sessionRoutes);
app.use("/api/attendance", authMiddleware, attendanceRoutes);
app.use("/api/exams", authMiddleware, examRoutes);
app.use("/api/leaves", authMiddleware, leaveRoutes);
app.use("/api/timetable", authMiddleware, timetableRoutes);
app.use("/api/grades", authMiddleware, gradeRoutes);
app.use("/api/reports", authMiddleware, reportRoutes);
app.use("/api/notifications", authMiddleware, notificationRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const { getLocalIp } = require("./utils/network");
const networkIp = getLocalIp();

app.listen(PORT, "0.0.0.0", async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");
    console.log(`🚀 Server is running on:`);
    console.log(`   - Local:    http://localhost:${PORT}`);
    console.log(`   - Network:  http://${networkIp}:${PORT}`);

    // Update process env for use in other modules if needed
    process.env.VITE_NETWORK_IP = networkIp;
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    process.exit(1);
  }
});

// Handle shutdown gracefully
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
});
