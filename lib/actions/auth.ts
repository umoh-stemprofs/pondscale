"use server";

import { redirect } from "next/navigation";
import {
  DEMO_EMAIL,
  firstIssue,
  hashPassword,
  loginSchema,
  resolveLogin,
  safeNextPath,
  signupSchema,
  type FormState,
} from "@/lib/auth";
import { DB_BUSY_ERROR } from "@/lib/validation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { DEFAULT_FARM_LOCATION } from "@/lib/config";

// Auth server actions (docs/02-pondscale.md step 4A). Rules: Zod on every
// input, bcrypt cost 10, one plain sentence on failure, session cookie set by
// iron-session (httpOnly, sameSite lax, secure in production — configured in
// lib/session-config.ts). The SESSION_SECRET value is never logged.

const readString = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: readString(formData, "name"),
    email: readString(formData, "email"),
    password: readString(formData, "password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists — log in instead." };

  let userId: string;
  try {
    const user = await db.user.create({
      data: { name, email, passHash: await hashPassword(password) },
    });
    // Every farmer gets their own farm, so no screen is a dead end.
    await db.farm.create({
      data: {
        userId: user.id,
        name: `${name}'s farm`,
        lat: DEFAULT_FARM_LOCATION.lat,
        lon: DEFAULT_FARM_LOCATION.lon,
      },
    });
    userId = user.id;
  } catch {
    // Unique race on email, or the database is slow.
    const raced = await db.user.findUnique({ where: { email } }).catch(() => null);
    if (raced) return { error: "An account with that email already exists — log in instead." };
    return { error: DB_BUSY_ERROR };
  }

  const session = await getSession();
  session.userId = userId;
  await session.save();
  redirect("/");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: readString(formData, "email"),
    password: readString(formData, "password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const next = safeNextPath(readString(formData, "next"));

  let user;
  try {
    user = await db.user.findUnique({ where: { email: parsed.data.email } });
  } catch {
    return { error: DB_BUSY_ERROR };
  }

  const outcome = await resolveLogin(user, parsed.data.password);
  if (!outcome.ok) return { error: outcome.error };

  const session = await getSession();
  session.userId = outcome.user.id;
  await session.save();
  redirect(next);
}

/// Shown only when DEMO_MODE=true (checked again on the server, never trusted
/// from the client): logs in as the seeded demo farmer.
export async function demoLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  if (process.env.DEMO_MODE !== "true") {
    return { error: "Demo mode is off. Create your own account instead." };
  }

  let user;
  try {
    user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  } catch {
    return { error: DB_BUSY_ERROR };
  }
  if (!user) return { error: "The demo account is missing. Run npm run db:seed." };

  const session = await getSession();
  session.userId = user.id;
  await session.save();
  redirect(safeNextPath(readString(formData, "next")));
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
