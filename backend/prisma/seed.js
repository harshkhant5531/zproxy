const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    console.log("Starting seed...");

    const saltRounds = 10;
    const adminPassword = await bcrypt.hash("admin123", saltRounds);
    const facultyPassword = await bcrypt.hash("faculty123", saltRounds);
    const studentPassword = await bcrypt.hash("student123", saltRounds);

    // 1. Create Users
    const admin = await prisma.users.upsert({
        where: { email: "admin@aura.edu" },
        update: {},
        create: {
            username: "admin",
            email: "admin@aura.edu",
            passwordHash: adminPassword,
            role: "admin",
            status: "active",
            adminProfile: {
                create: {
                    fullName: "System Administrator",
                    phone: "1234567890",
                },
            },
        },
    });

    const faculty1 = await prisma.users.upsert({
        where: { email: "rajesh.kumar@aura.edu" },
        update: {},
        create: {
            username: "rajesh_kumar",
            email: "rajesh.kumar@aura.edu",
            passwordHash: facultyPassword,
            role: "faculty",
            status: "active",
            facultyProfile: {
                create: {
                    fullName: "Dr. Rajesh Kumar",
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
            passwordHash: studentPassword,
            role: "student",
            status: "active",
            studentProfile: {
                create: {
                    fullName: "Aarav Sharma",
                    studentId: "STU2026001",
                    department: "Computer Science",
                    semester: 5,
                },
            },
        },
    });

    // 2. Create Course
    const course1 = await prisma.course.upsert({
        where: { code: "CS301" },
        update: {},
        create: {
            code: "CS301",
            name: "Data Structures & Algorithms",
            department: "Computer Science",
            credits: 4,
            semester: 5,
            facultyId: faculty1.id,
            students: {
                connect: { id: student1.id },
            },
        },
    });

    // 3. Create Subject
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

    // 4. Create Session
    const session1 = await prisma.session.create({
        data: {
            courseId: course1.id,
            subjectId: subject1.id,
            facultyId: faculty1.id,
            topic: "Graph Algorithms - BFS & DFS",
            description: "Introduction to graph traversal algorithms",
            sessionType: "lecture",
            date: new Date(),
            startTime: "10:00 AM",
            endTime: "11:30 AM",
            duration: 90,
            status: "scheduled",
        },
    });

    console.log("Seed complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
