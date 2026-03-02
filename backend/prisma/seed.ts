import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import "dotenv/config";
import studentsData from "../extracted_students.json";

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

  // ── 1. Admin User ─────────────────────────────────────────────────────────────
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

  console.log("✅ Admin created:", admin.id);

  // ── 2. Faculty Members ───────────────────────────────────────────────────────
  const facultyData = [
    {
      fullName: "Dixita Kagathara",
      email: "dixita.kagathara@aura.edu",
      username: "dixita_kagathara",
      employeeId: "FAC2026001",
      department: "Computer Science",
      designation: "Associate Professor",
      subjects: ["Automata Theory and Compiler Construction (ATCC)"],
    },
    {
      fullName: "Firoz Sherasiya",
      email: "firoz.sherasiya@aura.edu",
      username: "firoz_sherasiya",
      employeeId: "FAC2026002",
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["Operating Systems (OS)"],
    },
    {
      fullName: "Javed Nathani",
      email: "javed.nathani@aura.edu",
      username: "javed_nathani",
      employeeId: "FAC2026003",
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["Foundations of Algorithms (FOA)"],
    },
    {
      fullName: "Jayesh Vagadiya",
      email: "jayesh.vagadiya@aura.edu",
      username: "jayesh_vagadiya",
      employeeId: "FAC2026004",
      department: "Computer Science",
      designation: "Professor",
      subjects: [
        "Machine Learning and Deep Learning (MLDL)",
        "Machine Learning (ML)",
      ],
    },
    {
      fullName: "Arjun Bala",
      email: "arjun.bala@aura.edu",
      username: "arjun_bala",
      employeeId: "FAC2026005",
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["Advanced Web Technologies (AWT)"],
    },
    {
      fullName: "Maulik Trivedi",
      email: "maulik.trivedi@aura.edu",
      username: "maulik_trivedi",
      employeeId: "FAC2026006",
      department: "Computer Science",
      designation: "Associate Professor",
      subjects: ["Information Network Security (INS)"],
    },
    {
      fullName: "Mayur Padia",
      email: "mayur.padia@aura.edu",
      username: "mayur_padia",
      employeeId: "FAC2026007",
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["UI/UX Design"],
    },
    {
      fullName: "Naimish Vadodariya",
      email: "naimish.vadodariya@aura.edu",
      username: "naimish_vadodariya",
      employeeId: "FAC2026008",
      department: "Computer Science",
      designation: "Professor",
      subjects: [".NET", "Advanced .NET", "Advanced Advanced .NET"],
    },
    {
      fullName: "Mehul Bhundiya",
      email: "mehul.bhundiya@aura.edu",
      username: "mehul_bhundiya",
      employeeId: "FAC2026009",
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["Flutter", "Advanced Flutter"],
    },
  ];

  const faculties = [];
  for (const faculty of facultyData) {
    const user = await prisma.users.upsert({
      where: { email: faculty.email },
      update: {},
      create: {
        username: faculty.username,
        email: faculty.email,
        passwordHash: facultyHash,
        role: "faculty",
        status: "active",
        facultyProfile: {
          create: {
            fullName: faculty.fullName,
            employeeId: faculty.employeeId,
            department: faculty.department,
            designation: faculty.designation,
          },
        },
      },
    });
    faculties.push({ ...faculty, user });
  }

  console.log("✅ Faculty created:", faculties.length, "members");

  // ── 3. Courses & Subjects ─────────────────────────────────────────────────────
  // Core Courses
  const coreCourses = [
    {
      code: "CS601",
      name: "Automata Theory and Compiler Construction (ATCC)",
      credits: 4,
      semester: 6,
      faculty: "Dixita Kagathara",
    },
    {
      code: "CS602",
      name: "Operating Systems (OS)",
      credits: 4,
      semester: 6,
      faculty: "Firoz Sherasiya",
    },
    {
      code: "CS603",
      name: "Foundations of Algorithms (FOA)",
      credits: 4,
      semester: 6,
      faculty: "Javed Nathani",
    },
  ];

  // Elective Courses
  const electiveCourses = [
    {
      code: "CS604",
      name: "Machine Learning and Deep Learning (MLDL)",
      credits: 3,
      semester: 6,
      faculty: "Jayesh Vagadiya",
    },
    {
      code: "CS605",
      name: "Machine Learning (ML)",
      credits: 3,
      semester: 6,
      faculty: "Jayesh Vagadiya",
    },
    {
      code: "CS606",
      name: "Advanced Web Technologies (AWT)",
      credits: 3,
      semester: 6,
      faculty: "Arjun Bala",
    },
    {
      code: "CS607",
      name: "Information Network Security (INS)",
      credits: 3,
      semester: 6,
      faculty: "Maulik Trivedi",
    },
    {
      code: "CS608",
      name: "UI/UX Design",
      credits: 3,
      semester: 6,
      faculty: "Mayur Padia",
    },
    {
      code: "CS609",
      name: ".NET",
      credits: 3,
      semester: 6,
      faculty: "Naimish Vadodariya",
    },
    {
      code: "CS610",
      name: "Advanced .NET",
      credits: 3,
      semester: 6,
      faculty: "Naimish Vadodariya",
    },
    {
      code: "CS611",
      name: "Advanced Advanced .NET",
      credits: 3,
      semester: 6,
      faculty: "Naimish Vadodariya",
    },
    {
      code: "CS612",
      name: "Flutter",
      credits: 3,
      semester: 6,
      faculty: "Mehul Bhundiya",
    },
    {
      code: "CS613",
      name: "Advanced Flutter",
      credits: 3,
      semester: 6,
      faculty: "Mehul Bhundiya",
    },
  ];

  const allCourses = [...coreCourses, ...electiveCourses];
  const courses: Array<{
    code: string;
    name: string;
    credits: number;
    semester: number;
    faculty: string;
    id: number;
    subjectId: number;
    facultyId: number;
  }> = [];

  for (const courseData of allCourses) {
    const faculty = faculties.find((f) => f.fullName === courseData.faculty);
    if (!faculty) {
      console.error(`Faculty not found: ${courseData.faculty}`);
      continue;
    }

    const course = await prisma.course.upsert({
      where: { code: courseData.code },
      update: {},
      create: {
        code: courseData.code,
        name: courseData.name,
        department: "Computer Science",
        credits: courseData.credits,
        semester: courseData.semester,
        totalClasses: 40,
        facultyId: faculty.user.id,
      },
    });

    // Create subject for each course
    const subject = await prisma.subject.upsert({
      where: { id: course.id },
      update: {},
      create: {
        courseId: course.id,
        name: courseData.name,
        credits: courseData.credits,
        totalClasses: 40,
      },
    });

    courses.push({
      ...courseData,
      id: course.id,
      subjectId: subject.id,
      facultyId: faculty.user.id,
    });
  }

  console.log("✅ Courses created:", courses.length, "courses");

  // ── 4. Students ──────────────────────────────────────────────────────────────
  const students = [];

  for (const studentEntry of studentsData) {
    const [index, enroll, class_, rollno, name, elective1, elective2] =
      studentEntry;

    // Determine batch
    const batch = "2023-2027";
    const semester = 6;

    // Format username and email
    const username = name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    const email = `${username}@aura.edu`;

    // Determine subjects
    const studentSubjects: any[] = [];

    // Add core subjects (ATCC, OS, FOA)
    coreCourses.forEach((coreCourse) => {
      const course = courses.find((c) => c.name === coreCourse.name);
      if (course) {
        studentSubjects.push(course);
      }
    });

    // Add electives
    if (elective1) {
      const normalizedElective1 = elective1.trim();
      let mappedElective1 = normalizedElective1;
      if (normalizedElective1 === "ASP. NET Core") mappedElective1 = ".NET";
      if (normalizedElective1 === "Advanced Web Technology")
        mappedElective1 = "Advanced Web Technologies (AWT)";
      if (normalizedElective1 === "UI/UX Designing")
        mappedElective1 = "UI/UX Design";

      const course = courses.find(
        (c) =>
          c.name.includes(mappedElective1) || mappedElective1.includes(c.name),
      );
      if (course) {
        studentSubjects.push(course);
      }
    }

    if (elective2) {
      const normalizedElective2 = elective2.trim();
      let mappedElective2 = normalizedElective2;
      if (normalizedElective2 === "ASP. NET Core") mappedElective2 = ".NET";
      if (normalizedElective2 === "Advanced Web Technology")
        mappedElective2 = "Advanced Web Technologies (AWT)";
      if (normalizedElective2 === "UI/UX Designing")
        mappedElective2 = "UI/UX Design";

      const course = courses.find(
        (c) =>
          c.name.includes(mappedElective2) || mappedElective2.includes(c.name),
      );
      if (course && !studentSubjects.find((s) => s.code === course.code)) {
        studentSubjects.push(course);
      }
    }

    // Create student user with profiles and enrollments in one transaction
    const user = await prisma.users.upsert({
      where: { email },
      update: {
        studentCourses: {
          set: studentSubjects.map(s => ({ id: s.id }))
        },
        studentSubjects: {
          set: studentSubjects.map(s => ({ id: s.subjectId }))
        }
      },
      create: {
        username,
        email,
        passwordHash: studentHash,
        role: "student",
        status: "active",
        studentProfile: {
          create: {
            fullName: name,
            enrollmentNumber: enroll,
            rollNumber: rollno,
            department: "Computer Science",
            batch,
            currentSemester: semester,
            parentPhone: `91${Math.floor(8000000000 + Math.random() * 1999999999)}`,
            parentEmail: `parent.${username}@gmail.com`,
          },
        },
        studentCourses: {
          connect: studentSubjects.map(s => ({ id: s.id }))
        },
        studentSubjects: {
          connect: studentSubjects.map(s => ({ id: s.subjectId }))
        }
      },
    });

    students.push({
      user,
      enroll,
      name,
      class: class_,
      rollno,
      batch,
      semester,
      subjects: studentSubjects,
    });
  }

  console.log("✅ Students created:", students.length, "students");

  // ── 5. Timetable ─────────────────────────────────────────────────────────────
  // Create a sample timetable
  const days = [1, 2, 3, 4, 5]; // Monday to Friday
  const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00"];
  const rooms = ["LH-201", "LH-202", "LH-203", "Lab-1", "Lab-2"];

  const timetableEntries: Array<{
    courseId: number;
    subjectId: number;
    facultyId: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    roomNumber: string;
    semester: number;
  }> = [];

  courses.forEach((course, index) => {
    const day = days[index % days.length];
    const timeSlot = timeSlots[index % timeSlots.length];
    const room = rooms[index % rooms.length];

    timetableEntries.push({
      courseId: course.id,
      subjectId: course.subjectId,
      facultyId: course.facultyId,
      dayOfWeek: day,
      startTime: timeSlot,
      endTime: `${parseInt(timeSlot.split(":")[0]) + 1}:00`,
      roomNumber: room,
      semester: 6,
    });
  });

  await prisma.timetable.createMany({
    data: timetableEntries,
    skipDuplicates: true,
  });

  console.log("✅ Timetable entries created:", timetableEntries.length);

  // ── 6. Historical Data (Attendance & Grades) ──────────────────────────────
  console.log("📊 Generating historical data...");
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Create sessions and attendance for the last 30 days
  for (const course of courses) {
    const courseStudents = students.filter(s => s.subjects.some(sub => sub.id === course.id));

    // Generate ~15 sessions per course
    for (let i = 0; i < 15; i++) {
      const sessionDate = new Date(thirtyDaysAgo);
      sessionDate.setDate(sessionDate.getDate() + (i * 2)); // Every 2 days
      if (sessionDate > now) break;

      const session = await prisma.session.create({
        data: {
          courseId: course.id,
          subjectId: course.subjectId,
          facultyId: course.facultyId,
          topic: `Historical Lecture ${i + 1}`,
          sessionType: "lecture",
          date: sessionDate,
          startTime: "09:00",
          endTime: "10:00",
          status: "completed",
          attendanceCount: courseStudents.length
        }
      });

      // Create attendance for students
      const attendanceData = courseStudents.map(student => ({
        sessionId: session.id,
        studentId: student.user.id,
        status: Math.random() > 0.15 ? "present" : "absent", // 85% attendance
        timestamp: sessionDate
      }));

      await prisma.attendance.createMany({ data: attendanceData });
    }

    // Update totalClasses to match historical sessions
    await prisma.course.update({
      where: { id: course.id },
      data: { totalClasses: 30 }
    });

    // Create a few grades for semester 5 (previous)
    const gradeData = courseStudents.map(student => ({
      studentId: student.user.id,
      courseId: course.id,
      subjectId: course.subjectId || course.id,
      marksObtained: 60 + Math.floor(Math.random() * 35),
      totalMarks: 100,
      grade: "A",
      semester: 5,
      year: 2025
    }));

    await prisma.grade.createMany({ data: gradeData });
  }

  // Create some report archival entries
  await prisma.report.create({
    data: {
      reportType: "attendance",
      generatedBy: admin.id,
      status: "completed",
      fileName: "Attendance_Audit_Feb2026.pdf",
      fileUrl: "/reports/download/1",
      format: "pdf"
    }
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
