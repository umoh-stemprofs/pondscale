import type { SessionOptions } from "iron-session";

// Session settings shared by middleware (edge runtime) and server actions
// (node runtime). This module deliberately has NO imports besides the type —
// middleware must never pull in next/headers or Prisma. The secret lives in
// .env (git-ignored) and is never printed, logged or committed.

export interface SessionData {
  userId?: string;
}

export const SESSION_COOKIE = "pondscale_session";

if (!process.env.SESSION_SECRET) {
  // Fail loudly with the KEY name only — never the value (docs/00-global.md §0).
  throw new Error("SESSION_SECRET is missing. Copy .env.example to .env and set it.");
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: SESSION_COOKIE,
  ttl: 60 * 60 * 24 * 14, // 14 days
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};
