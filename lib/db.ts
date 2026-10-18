import { PrismaClient } from "@prisma/client";

// One client per process. In dev, Next.js re-evaluates modules on every edit,
// so keep the instance on globalThis to avoid exhausting database connections.

// docs/00-global.md §0: this PC is on a slow network and the database is hosted
// on Neon. Prisma's default connect timeout (5 s) is shorter than a cold TLS
// handshake to the pooler here, which surfaces as P1001 "can't reach database
// server" on some requests. Give connections a longer budget instead. The URL
// itself is only passed through — never logged or printed.
function withConnectTimeout(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "20");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: withConnectTimeout(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
