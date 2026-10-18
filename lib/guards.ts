import type { Farm } from "@prisma/client";
import { redirect } from "next/navigation";
import { DEFAULT_FARM_LOCATION } from "./config";
import { db } from "./db";
import { getSession } from "./session";

// Server-side guards used by every protected page and action
// (docs/00-global.md §3: middleware checks the session, and each page/action
// re-checks it — never only in the UI).

/** Returns the session's userId or redirects to /login. */
export async function requireUser(): Promise<string> {
  const session = await getSession();
  const userId = session.userId;
  if (!userId) redirect("/login");
  return userId;
}

/**
 * Like requireUser, but also confirms the account still exists. A session can
 * outlive its user (an account removed while the cookie is still valid) and
 * that must land on the login screen, not on an empty "database is down"
 * screen. The cookie is cleared by /api/session/expired because a Server
 * Component cannot write cookies itself.
 */
export async function requireAccount(): Promise<string> {
  const userId = await requireUser();
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) redirect("/api/session/expired");
  } catch {
    // Database slow: keep the session and let the page show its own message.
  }
  return userId;
}

/**
 * The user's farm, created on first use so no screen is ever a dead end.
 * Callers that need the "database slow" fallback should wrap this in
 * try/catch and fall back to DEFAULT_FARM_LOCATION for weather.
 */
export async function getOrCreateFarm(userId: string): Promise<Farm> {
  const existing = await db.farm.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return db.farm.create({
    data: {
      userId,
      name: "My farm",
      lat: DEFAULT_FARM_LOCATION.lat,
      lon: DEFAULT_FARM_LOCATION.lon,
    },
  });
}
