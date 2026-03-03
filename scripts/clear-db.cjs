require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../backend/generated/prisma/client");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearDatabase() {
    console.log("🧹 Clearing database...");

    try {
        // Order matters for relational databases
        const tablenames = [
            'AuditLog',
            'Notification',
            'Report',
            'Timetable',
            'Grade',
            'LeaveApplication',
            'ExamPermit',
            'QrCode',
            'Attendance',
            'Session',
            'Subject',
            'Course',
            'StudentProfile',
            'FacultyProfile',
            'AdminProfile',
            'Users'
        ];

        for (const tablename of tablenames) {
            if (tablename === 'Users') {
                // Keep the main admin user if possible, or just clear all and re-seed
                console.log(`Clearing ${tablename}...`);
                await prisma.users.deleteMany({
                    where: {
                        NOT: {
                            email: "admin@aura.edu"
                        }
                    }
                });
            } else {
                console.log(`Clearing ${tablename}...`);
                await prisma[tablename.charAt(0).toLowerCase() + tablename.slice(1)].deleteMany({});
            }
        }

        console.log("✅ Database cleared (except Admin user).");
    } catch (error) {
        console.error("❌ Error clearing database:", error);
    } finally {
        await prisma.$disconnect();
    }
}

clearDatabase();
