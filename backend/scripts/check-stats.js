const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courseCount = await prisma.course.count();
    const studentCount = await prisma.users.count({ where: { role: 'student' } });
    const facultyCount = await prisma.users.count({ where: { role: 'faculty' } });

    console.log('--- DATABASE STATS ---');
    console.log('Total Courses:', courseCount);
    console.log('Total Students:', studentCount);
    console.log('Total Faculty:', facultyCount);

    const courses = await prisma.course.findMany({ select: { id: true, name: true, facultyId: true } });
    console.log('\n--- COURSES ---');
    console.log(courses);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
