require('dotenv').config();
const prisma = require('../prisma/index');

async function fix() {
    console.log('--- DEEP DATA FIX START ---');

    // 1. Assign Faculty to Subjects (matching seed.ts logic)
    const mapping = [
        { sub: "Automata Theory and Compiler Construction (ATCC)", fac: "dixita_kagathara" },
        { sub: "Operating Systems (OS)", fac: "firoz_sherasiya" },
        { sub: "Fundamentals of Accounting (FOA)", fac: "javed_nathani" },
        { sub: "Machine Learning and Deep Learning (MLDL)", fac: "jayesh_vagadiya" },
        { sub: "Machine Learning (ML)", fac: "jayesh_vagadiya" },
        { sub: "Advanced Web Technologies (AWT)", fac: "arjun_bala" },
        { sub: "Information Network Security (INS)", fac: "maulik_trivedi" },
        { sub: "UI/UX Designing", fac: "mayur_padia" },
        { sub: ".NET", fac: "naimish_vadodariya" },
        { sub: "Advanced .NET", fac: "naimish_vadodariya" },
        { sub: "Advanced Advanced .NET", fac: "naimish_vadodariya" },
        { sub: "Flutter", fac: "mehul_bhundiya" },
        { sub: "Advanced Flutter", fac: "mehul_bhundiya" }
    ];

    for (const item of mapping) {
        const faculty = await prisma.users.findUnique({ where: { username: item.fac } });
        if (faculty) {
            await prisma.subject.updateMany({
                where: { name: { contains: item.sub } },
                data: { facultyId: faculty.id }
            });
            console.log(`Linked subject ${item.sub} to ${item.fac}`);
        }
    }

    // 2. Global Student-Subject Enrollment (Non-Electives)
    // Ensure "BTECH-CS-S6" course exists and is the one being used
    const course = await prisma.course.findFirst({ where: { code: "BTECH-CS-S6" } });
    if (!course) {
        console.error('BTECH-CS-S6 not found');
        return;
    }

    const students = await prisma.users.findMany({ where: { role: 'student' } });
    const subjects = await prisma.subject.findMany({
        where: {
            courseId: course.id,
            name: {
                in: [
                    "Automata Theory and Compiler Construction (ATCC)",
                    "Operating Systems (OS)",
                    "Fundamentals of Accounting (FOA)"
                ]
            }
        }
    });

    console.log(`Enrolling ${students.length} students into ${subjects.length} core subjects...`);

    for (const student of students) {
        await prisma.users.update({
            where: { id: student.id },
            data: {
                studentCourses: { connect: [{ id: course.id }] },
                studentSubjects: { connect: subjects.map(s => ({ id: s.id })) }
            }
        });
    }

    console.log('--- DEEP DATA FIX COMPLETE ---');
}

fix().catch(e => console.error(e)).finally(() => prisma.$disconnect());
