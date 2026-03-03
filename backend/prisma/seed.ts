import "dotenv/config";
import prisma from "./index";
import argon2 from "argon2";
import studentsData from "../extracted_students.json";

// In Prisma 7 with adapters, we use the centralized client from index.js

async function main() {
  console.log("🌱 Starting seed...");

  const [adminHash, facultyHash, studentHash] = await Promise.all([
    argon2.hash("admin123"),
    argon2.hash("faculty123"),
    argon2.hash("student123"),
  ]);

  // ── 1. Admin User ─────────────────────────────────────────────────────────────
  const admin = await prisma.users.upsert({
    where: { email: "admin@darshan.ac.in" },
    update: {
      passwordHash: adminHash,
      status: "active",
      role: "admin",
    },
    create: {
      username: "admin",
      email: "admin@darshan.ac.in",
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
      email: "dixita.kagathara@darshan.ac.in",
      username: "dixita_kagathara",
      employeeId: "FAC2026001",
      department: "Computer Science",
      designation: "Associate Professor",
      subjects: ["Automata Theory and Compiler Construction (ATCC)"],
    },
    {
      fullName: "Firoz Sherasiya",
      email: "firoz.sherasiya@darshan.ac.in",
      username: "firoz_sherasiya",
      employeeId: "FAC2026002",
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["Operating Systems (OS)"],
    },
    {
      fullName: "Javed Nathani",
      email: "javed.nathani@darshan.ac.in",
      username: "javed_nathani",
      employeeId: "FAC2026003",
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["Fundamentals of Accounting (FOA)"],
    },
    {
      fullName: "Jayesh Vagadiya",
      email: "jayesh.vagadiya@darshan.ac.in",
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
      email: "arjun.bala@darshan.ac.in",
      username: "arjun_bala",
      employeeId: "FAC2026005",
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["Advanced Web Technologies (AWT)"],
    },
    {
      fullName: "Maulik Trivedi",
      email: "maulik.trivedi@darshan.ac.in",
      username: "maulik_trivedi",
      employeeId: "FAC2026006",
      department: "Computer Science",
      designation: "Associate Professor",
      subjects: ["Information Network Security (INS)"],
    },
    {
      fullName: "Mayur Padia",
      email: "mayur.padia@darshan.ac.in",
      username: "mayur_padia",
      employeeId: "FAC2026007",
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["UI/UX Designing"],
    },
    {
      fullName: "Naimish Vadodariya",
      email: "naimish.vadodariya@darshan.ac.in",
      username: "naimish_vadodariya",
      employeeId: "FAC2026008",
      department: "Computer Science",
      designation: "Professor",
      subjects: [".NET", "Advanced .NET", "Advanced Advanced .NET"],
    },
    {
      fullName: "Mehul Bhundiya",
      email: "mehul.bhundiya@darshan.ac.in",
      username: "mehul_bhundiya",
      employeeId: "FAC2026012",
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["Flutter", "Advanced Flutter"],
    },
  ];

  const faculties = [];
  for (const faculty of facultyData) {
    const user = await prisma.users.upsert({
      where: { email: faculty.email },
      update: {
        passwordHash: facultyHash,
        status: "active",
        role: "faculty",
      },
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
  // We define a single "Program" Course for the entire semester
  const programCourse = await prisma.course.upsert({
    where: { code: "BTECH-CS-S6" },
    update: {},
    create: {
      code: "BTECH-CS-S6",
      name: "B.Tech Computer Science - Sem 6",
      department: "Computer Science",
      credits: 24,
      semester: 6,
      totalClasses: 0,
    },
  });

  const subjectData = [
    { code: "CS601", name: "Automata Theory and Compiler Construction (ATCC)", credits: 4, faculty: "Dixita Kagathara" },
    { code: "CS602", name: "Operating Systems (OS)", credits: 4, faculty: "Firoz Sherasiya" },
    { code: "CS603", name: "Fundamentals of Accounting (FOA)", credits: 4, faculty: "Javed Nathani" },
    { code: "CS606", name: "Advanced Web Technologies (AWT)", credits: 3, faculty: "Arjun Bala" },
    { code: "CS607", name: "Information Network Security (INS)", credits: 3, faculty: "Maulik Trivedi" },
    { code: "CS608", name: "UI/UX Designing", credits: 3, faculty: "Mayur Padia" },
    { code: "CS609", name: ".NET", credits: 3, faculty: "Naimish Vadodariya" },
    { code: "CS610", name: "Advanced .NET", credits: 3, faculty: "Naimish Vadodariya" },
    { code: "CS611", name: "Advanced Advanced .NET", credits: 3, faculty: "Naimish Vadodariya" },
    { code: "CS612", name: "Flutter", credits: 3, faculty: "Mehul Bhundiya" },
    { code: "CS613", name: "Advanced Flutter", credits: 3, faculty: "Mehul Bhundiya" },
    { code: "CS604", name: "Machine Learning and Deep Learning (MLDL)", credits: 3, faculty: "Jayesh Vagadiya" },
    { code: "CS605", name: "Machine Learning (ML)", credits: 3, faculty: "Jayesh Vagadiya" },
    { code: "CS614", name: "Mobile Computing and Wireless Communication (MCWC)", credits: 3, faculty: "Dixita Kagathara" },
  ];

  const subjects: any[] = [];
  for (const s of subjectData) {
    const faculty = faculties.find((f) => f.fullName === s.faculty);
    if (!faculty) continue;

    const subject = await prisma.subject.upsert({
      where: { name_courseId: { name: s.name, courseId: programCourse.id } },
      update: {},
      create: {
        name: s.name,
        courseId: programCourse.id,
        credits: s.credits,
        totalClasses: 40,
      },
    });

    subjects.push({
      ...s,
      id: subject.id,
      courseId: programCourse.id,
      facultyId: faculty.user.id,
    });
  }

  console.log("✅ Program and Subjects synchronized.");

  // ── 4. Students ──────────────────────────────────────────────────────────────
  console.log(`📡 Preparing ${studentsData.length} students for deployment...`);

  const studentOperations = studentsData.map((studentEntry) => {
    const [index, enroll, class_, rollno, name, elective1, elective2] = studentEntry;
    const batch = class_; // "A1", "A2", etc.
    const semester = 6;
    const username = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const email = `${enroll}@darshan.ac.in`;

    const studentSubjects: any[] = [];
    // Core subjects assigned to everyone
    ["Automata Theory and Compiler Construction (ATCC)", "Operating Systems (OS)", "Fundamentals of Accounting (FOA)"].forEach(name => {
      const subject = subjects.find(s => s.name === name);
      if (subject) studentSubjects.push(subject);
    });

    const processElective = (elective: string) => {
      if (!elective || elective === "Not Given") return;
      const normalized = elective.trim().toLowerCase();
      let mappedName = "";

      // Elective 1 Mapping
      if (normalized.includes("web technology") || normalized.includes("awt")) mappedName = "Advanced Web Technologies (AWT)";
      else if (normalized.includes("ins") || normalized.includes("security")) mappedName = "Information Network Security (INS)";
      else if (normalized.includes("ui/ux") || normalized.includes("designing")) mappedName = "UI/UX Designing";
      else if (normalized.includes("asp. net core") || normalized.includes(".net")) {
        if (normalized.includes("advanced")) {
          if (normalized.includes("modern architecture")) mappedName = "Advanced Advanced .NET";
          else mappedName = "Advanced .NET";
        } else mappedName = ".NET";
      }
      else if (normalized.includes("flutter")) {
        if (normalized.includes("advanced")) mappedName = "Advanced Flutter";
        else mappedName = "Flutter";
      }

      // Elective 2 Mapping
      else if (normalized.includes("machine learning")) {
        if (normalized.includes("deep learning") || normalized.includes("mldl")) mappedName = "Machine Learning and Deep Learning (MLDL)";
        else mappedName = "Machine Learning (ML)";
      }
      else if (normalized.includes("mcwc") || normalized.includes("mobile computing")) mappedName = "Mobile Computing and Wireless Communication (MCWC)";

      if (mappedName) {
        const subject = subjects.find(s => s.name === mappedName);
        if (subject && !studentSubjects.find(s => s.id === subject.id)) {
          studentSubjects.push(subject);
        }
      }
    };

    processElective(elective1);
    processElective(elective2);

    return prisma.users.create({
      data: {
        username: enroll,
        email,
        passwordHash: studentHash,
        role: "student",
        status: "active",
        studentCourses: {
          connect: [{ id: programCourse.id }]
        },
        studentSubjects: {
          connect: studentSubjects.map((s) => ({ id: s.id })),
        },
        studentProfile: {
          create: {
            fullName: name,
            enrollmentNumber: enroll,
            rollNumber: rollno,
            department: "Computer Science",
            batch,
            currentSemester: semester,
            parentPhone: `91${Math.floor(8000000000 + Math.random() * 1999999999)}`,
            parentEmail: `parent.${enroll}@darshan.ac.in`,
          },
        },
      }
    });
  });

  // Execute in chunks to avoid memory issues or DB connection timeouts
  const chunkSize = 50;
  for (let i = 0; i < studentOperations.length; i += chunkSize) {
    const chunk = studentOperations.slice(i, i + chunkSize);
    await Promise.all(chunk);
    process.stdout.write(`⚡ Progress: ${Math.min(i + chunkSize, studentOperations.length)}/${studentOperations.length} students synchronized...\r`);
  }
  process.stdout.write('\n');

  console.log("✅ Students created:", studentOperations.length, "students");

  console.log("🎉 Seed complete! Core data (Faculty, Courses, Students) is ready. No historical sessions or grades created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
