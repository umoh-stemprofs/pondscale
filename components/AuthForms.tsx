"use client";

// Login and signup forms (docs/02-pondscale.md step 4A rule 1, design.md
// S-LOGIN-W / S-SIGNUP-W). Client components so a server-action error shows
// inline without a page reload: one plain sentence, no crash (design.md §6).

import Link from "next/link";
import { useState } from "react";
import { demoLogin, login, signup } from "@/lib/actions/auth";
import type { FormState } from "@/lib/auth";
import { AlertIcon } from "./icons";

const inputCls =
  "mt-1 h-12 w-full rounded-input border border-border bg-surface px-3 text-base outline-none focus:border-accent";
const labelCls = "block text-sm font-medium text-text";
const helperCls = "mt-1 text-sm text-muted";
const primaryCls =
  "flex h-12 w-full items-center justify-center gap-2 rounded-input bg-accent px-4 font-medium text-white disabled:opacity-60";
const secondaryCls =
  "flex h-12 w-full items-center justify-center gap-2 rounded-input border border-border bg-surface px-4 font-medium text-text disabled:opacity-60";

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-input border border-danger bg-danger-bg p-3 text-sm font-medium text-danger"
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      {error}
    </p>
  );
}

export function LoginForm({ next, demoMode }: { next: string; demoMode: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function run(action: (prev: FormState, data: FormData) => Promise<FormState>, data: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await action(null, data);
      if (result?.error) setError(result.error);
    } catch {
      // A redirect from the action lands here as a thrown control-flow
      // signal; anything else is a real failure, so show one sentence.
      setError("Could not log you in just now — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          data.set("next", next);
          void run(login, data);
        }}
      >
        <div>
          <label htmlFor="email" className={labelCls}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelCls}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className={`${inputCls} pr-20`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute bottom-0 right-0 h-12 rounded-input px-3 text-sm font-medium text-accent"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <ErrorLine error={error} />
        <button type="submit" disabled={pending} className={primaryCls}>
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      {demoMode ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const data = new FormData();
            data.set("next", next);
            void run(demoLogin, data);
          }}
          className={secondaryCls}
        >
          Try demo account
        </button>
      ) : null}

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent underline underline-offset-2">
          Create account
        </Link>
      </p>
    </div>
  );
}

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setPending(true);
        setError(null);
        void signup(null, data)
          .then((result) => {
            if (result?.error) setError(result.error);
          })
          .catch(() => setError("Could not create your account just now — try again."))
          .finally(() => setPending(false));
      }}
    >
      <div>
        <label htmlFor="name" className={labelCls}>
          Your name
        </label>
        <input id="name" name="name" autoComplete="name" required className={inputCls} />
      </div>
      <div>
        <label htmlFor="email" className={labelCls}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelCls}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-describedby="password-help"
          className={inputCls}
        />
        <p id="password-help" className={helperCls}>
          At least 8 characters.
        </p>
      </div>
      <ErrorLine error={error} />
      <button type="submit" disabled={pending} className={primaryCls}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent underline underline-offset-2">
          Back to login
        </Link>
      </p>
    </form>
  );
}
