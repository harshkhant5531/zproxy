const { config: loadEnv } = require("dotenv");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../generated/prisma/client");

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "backend", ".env"),
  resolve(__dirname, "..", ".env"),
  resolve(__dirname, "..", "..", ".env"),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: true });
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set for Prisma client initialization");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query", "error", "warn"] });

// Test connection on startup
prisma
  .$connect()
  .then(() => prisma.$queryRaw`SELECT 1`)
  .then(() => console.log("✅ Prisma connected to database"))
  .catch((err) => console.error("❌ Prisma connection failed:", err.message));

module.exports = prisma;
