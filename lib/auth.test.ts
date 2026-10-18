import { describe, expect, it } from "vitest";
import {
  BCRYPT_COST,
  firstIssue,
  hashPassword,
  loginSchema,
  resolveLogin,
  safeNextPath,
  signupSchema,
  verifyPassword,
} from "./auth";

// Auth rules from docs/02-pondscale.md step 4A: Zod validates every input,
// bcrypt cost 10, one plain sentence on a wrong password, and the database
// never holds a plain password.

const good = { name: "Ada", email: "ada@example.com", password: "fishpond1" };

describe("signupSchema", () => {
  it("accepts a valid signup and normalises the email", () => {
    const parsed = signupSchema.parse({ ...good, email: "  Ada@Example.COM ", name: " Ada " });
    expect(parsed).toEqual({ name: "Ada", email: "ada@example.com", password: "fishpond1" });
  });

  it("rejects a password shorter than 8 characters with one sentence", () => {
    const result = signupSchema.safeParse({ ...good, password: "1234567" });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toBe("Password needs at least 8 characters.");
  });

  it("rejects a missing name, a bad email and an over-long password", () => {
    expect(signupSchema.safeParse({ ...good, name: "   " }).success).toBe(false);
    expect(signupSchema.safeParse({ ...good, email: "not-an-email" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...good, password: "x".repeat(73) }).success).toBe(false);
  });

  it("accepts exactly 8 characters", () => {
    expect(signupSchema.safeParse({ ...good, password: "12345678" }).success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts a valid login and lowercases the email", () => {
    const parsed = loginSchema.parse({ email: " ADA@example.com", password: "fishpond1" });
    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects an empty password and a bad email", () => {
    expect(loginSchema.safeParse({ email: good.email, password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "ada", password: "fishpond1" }).success).toBe(false);
  });
});

describe("password storage", () => {
  it("stores a bcrypt hash at cost 10, never the plain password", async () => {
    const hash = await hashPassword("fishpond1");
    expect(hash).not.toContain("fishpond1");
    expect(hash.startsWith(`$2b$${BCRYPT_COST}$`) || hash.startsWith(`$2a$${BCRYPT_COST}$`)).toBe(
      true,
    );
  });

  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("fishpond1");
    expect(await verifyPassword("fishpond1", hash)).toBe(true);
    expect(await verifyPassword("fishpond2", hash)).toBe(false);
  });
});

describe("resolveLogin", () => {
  it("returns one sentence for a wrong password", async () => {
    const user = { passHash: await hashPassword("fishpond1") };
    const outcome = await resolveLogin(user, "wrong-password");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toBe("Wrong password — try again.");
  });

  it("returns one sentence when the email is unknown", async () => {
    const outcome = await resolveLogin(null, "whatever");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toContain("No account");
  });

  it("logs in with the right password", async () => {
    const user = { passHash: await hashPassword("fishpond1"), id: "user-1" };
    const outcome = await resolveLogin(user, "fishpond1");
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.user.id).toBe("user-1");
  });
});

describe("safeNextPath", () => {
  it("allows app paths and refuses other sites", () => {
    expect(safeNextPath("/ponds")).toBe("/ponds");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});
