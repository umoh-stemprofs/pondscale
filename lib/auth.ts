import { compare, hash } from "bcryptjs";
import { z } from "zod";

// Auth logic, pure so it can be unit tested without Next.js or a database
// (docs/00-global.md §2: logic lives in /lib with tests). The server actions
// in lib/actions/auth.ts wire these functions to sessions and the database.

export const BCRYPT_COST = 10;

/// The account created by prisma/seed.ts (docs: demo password in README only).
export const DEMO_EMAIL = "demo@pondscale.test";

export type FormState = { error?: string; saved?: boolean } | null;

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Keep your name under 80 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(200, "That email address is too long."),
  password: z
    .string()
    .min(8, "Password needs at least 8 characters.")
    .max(72, "Keep the password under 72 characters."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type SignupInput = z.infer<typeof signupSchema>;

/** Hash a password with bcrypt at cost 10 (docs/00-global.md §3). */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_COST);
}

/** Constant-time password check. Never throws on bad input. */
export function verifyPassword(plain: string, passHash: string): Promise<boolean> {
  return compare(plain, passHash);
}

export type LoginOutcome<U> =
  | { ok: true; user: U }
  | { ok: false; error: string };

/**
 * Resolve a login attempt. Unknown email and wrong password each return ONE
 * plain sentence saying what to do — no crash, no stack trace (design.md §6).
 */
export async function resolveLogin<U extends { passHash: string }>(
  user: U | null,
  plain: string,
): Promise<LoginOutcome<U>> {
  if (!user) {
    return { ok: false, error: "No account uses that email — create one first." };
  }
  if (!(await compare(plain, user.passHash))) {
    return { ok: false, error: "Wrong password — try again." };
  }
  return { ok: true, user };
}

/** First Zod issue as one plain sentence. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

/**
 * Only allow redirects to paths inside this app, so a crafted ?next= can
 * never send the browser to another site.
 */
export function safeNextPath(raw: FormDataEntryValue | string | null | undefined): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
