const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log('--- VERIFICATION START ---');

    // 1. Check a course and its related faculty
    const course = await prisma.course.findFirst({
        include: { faculty: true }
    });

    if (course && course.faculty) {
        console.log(`Course Found: ${course.code} (ID: ${course.id})`);
        console.log(`Faculty Assigned: ${course.faculty.username} (ID: ${course.facultyId})`);

        // Test logic: Simulated check
        const facultyIdFromReq = String(course.facultyId); // Simulate string coming from frontend
        const courseIdFromReq = String(course.id);

        console.log(`Testing type comparison with Number()...`);
        const isValid = Number(course.facultyId) === Number(facultyIdFromReq);
        console.log(`Match Result: ${isValid ? 'SUCCESS' : 'FAILURE'}`);
    } else {
        console.log('No assigned course/faculty found to test.');
    }
}

verify().catch(e => console.error(e)).finally(() => prisma.$disconnect());
