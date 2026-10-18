import { PrismaClient } from "@prisma/client";

// One client per process. In dev, Next.js re-evaluates modules on every edit,
// so keep the instance on globalThis to avoid exhausting database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}