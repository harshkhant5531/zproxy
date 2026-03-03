const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../generated/prisma/client");

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query", "error", "warn"] });

// Test connection on startup
prisma.$connect()
    .then(() => prisma.$queryRaw`SELECT 1`)
    .then(() => console.log("✅ Prisma connected to database"))
    .catch((err) => console.error("❌ Prisma connection failed:", err.message));

module.exports = prisma;
