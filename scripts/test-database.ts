import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection: OK");
  } catch (error) {
    console.error("Database connection: FAILED");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
