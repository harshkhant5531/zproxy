import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import "dotenv/config";

// Parse DATABASE_URL to connection parameters
const url = new URL(
  process.env.DATABASE_URL ||
    "mysql://root:dynamo@localhost:3306/aura_integrity_engine",
);

// Create Prisma adapter
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1), // Remove leading '/'
});

// Initialize PrismaClient with adapter
const prisma = new PrismaClient({
  adapter,
  log: ["query", "info", "warn", "error"],
});

async function main() {
  console.log("🌱 Starting seed...");

  const SALT = 10;
  const [adminHash, facultyHash, studentHash] = await Promise.all([
    bcrypt.hash("admin123", SALT),
    bcrypt.hash("faculty123", SALT),
    bcrypt.hash("student123", SALT),
  ]);

  // ── 1. Users ───────────────────────────────────────────────────────────────

  const admin = await prisma.users.upsert({
    where: { email: "admin@aura.edu" },
    update: {},
    create: {
      username: "admin",
      email: "admin@aura.edu",
      passwordHash: adminHash,
      role: "admin",
      status: "active",
      adminProfile: {
        create: { fullName: "System Administrator", phone: "0000000000" },
      },
    },
  });

  const faculty1 = await prisma.users.upsert({
    where: { email: "rajesh.kumar@aura.edu" },
    update: {},
    create: {
      username: "rajesh_kumar",
      email: "rajesh.kumar@aura.edu",
      passwordHash: facultyHash,
      role: "faculty",
      status: "active",
      facultyProfile: {
        create: {
          fullName: "Dr. Rajesh Kumar",
          employeeId: "FAC2026001",
          department: "Computer Science",
          designation: "Professor",
        },
      },
    },
  });

  const student1 = await prisma.users.upsert({
    where: { email: "aarav.sharma@aura.edu" },
    update: {},
    create: {
      username: "aarav_sharma",
      email: "aarav.sharma@aura.edu",
      passwordHash: studentHash,
      role: "student",
      status: "active",
      studentProfile: {
        create: {
          fullName: "Aarav Sharma",
          enrollmentNumber: "STU2026001",
          rollNumber: "CS-2026-001",
          department: "Computer Science",
          batch: "2024-2028",
          currentSemester: 5,
        },
      },
    },
  });

  const student2 = await prisma.users.upsert({
    where: { email: "priya.mehta@aura.edu" },
    update: {},
    create: {
      username: "priya_mehta",
      email: "priya.mehta@aura.edu",
      passwordHash: studentHash,
      role: "student",
      status: "active",
      studentProfile: {
        create: {
          fullName: "Priya Mehta",
          enrollmentNumber: "STU2026002",
          rollNumber: "CS-2026-002",
          department: "Computer Science",
          batch: "2024-2028",
          currentSemester: 5,
        },
      },
    },
  });

  console.log("✅ Users created:", {
    admin: admin.id,
    faculty1: faculty1.id,
    student1: student1.id,
    student2: student2.id,
  });

  // ── 2. Course ──────────────────────────────────────────────────────────────

  const course1 = await prisma.course.upsert({
    where: { code: "CS301" },
    update: {},
    create: {
      code: "CS301",
      name: "Data Structures & Algorithms",
      department: "Computer Science",
      credits: 4,
      semester: 5,
      totalClasses: 40,
      facultyId: faculty1.id,
      students: {
        connect: [{ id: student1.id }, { id: student2.id }],
      },
    },
  });

  const course2 = await prisma.course.upsert({
    where: { code: "CS302" },
    update: {},
    create: {
      code: "CS302",
      name: "Database Management Systems",
      department: "Computer Science",
      credits: 4,
      semester: 5,
      totalClasses: 36,
      facultyId: faculty1.id,
      students: {
        connect: [{ id: student1.id }, { id: student2.id }],
      },
    },
  });

  console.log("✅ Courses created:", {
    course1: course1.id,
    course2: course2.id,
  });

  // ── 3. Subject ─────────────────────────────────────────────────────────────

  const subject1 = await prisma.subject.upsert({
    where: { id: 1 },
    update: {},
    create: {
      courseId: course1.id,
      name: "Advanced DSA",
      credits: 4,
      totalClasses: 40,
    },
  });

  const subject2 = await prisma.subject.upsert({
    where: { id: 2 },
    update: {},
    create: {
      courseId: course2.id,
      name: "Query Optimization",
      credits: 4,
      totalClasses: 36,
    },
  });

  // ── 4. Sessions ────────────────────────────────────────────────────────────

  const session1 = await prisma.session.create({
    data: {
      courseId: course1.id,
      subjectId: subject1.id,
      facultyId: faculty1.id,
      topic: "Graph Algorithms – BFS & DFS",
      description: "Introduction to graph traversal algorithms",
      sessionType: "lecture",
      date: new Date(),
      startTime: "10:00",
      endTime: "11:30",
      duration: 90,
      status: "completed",
      attendanceCount: 2,
    },
  });

  // ── 5. Attendance ──────────────────────────────────────────────────────────

  await prisma.attendance.createMany({
    data: [
      { sessionId: session1.id, studentId: student1.id, status: "present" },
      { sessionId: session1.id, studentId: student2.id, status: "present" },
    ],
    skipDuplicates: true,
  });

  // ── 6. Timetable ───────────────────────────────────────────────────────────

  await prisma.timetable.create({
    data: {
      courseId: course1.id,
      subjectId: subject1.id,
      facultyId: faculty1.id,
      dayOfWeek: 1, // Monday
      startTime: "10:00",
      endTime: "11:30",
      roomNumber: "LH-201",
      semester: 5,
    },
  });

  // ── 7. Leave Application ───────────────────────────────────────────────────

  await prisma.leaveApplication.create({
    data: {
      userId: student1.id,
      leaveType: "sick",
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      reason: "Medical appointment",
      status: "pending",
    },
  });

  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
