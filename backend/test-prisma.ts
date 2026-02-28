import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

// Parse DATABASE_URL to connection parameters
const url = new URL(
  process.env.DATABASE_URL ||
    "mysql://root:dynamo@localhost:3306/aura_integrity_engine",
);

async function testPrisma() {
  try {
    console.log("Testing PrismaClient connection...");

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

    console.log("PrismaClient created successfully");

    const users = await prisma.users.findMany({ take: 1 });
    console.log("Users count:", users.length);

    await prisma.$disconnect();
    console.log("Test passed");
  } catch (error) {
    console.error("Error:", error);
  }
}

testPrisma();
