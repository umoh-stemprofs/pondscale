"use client";

// "Save check" on the result screen (docs/02-pondscale.md step 4B). It posts
// only the five typed numbers — the server recomputes everything and only
// then writes the row. On success the form is replaced by "Saved." plus a
// path onwards (design.md §6: the same action keeps the same name; no screen
// is a dead end).

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { saveCheck } from "@/lib/actions/checks";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 items-center justify-center gap-2 rounded-input bg-accent px-5 font-medium text-white disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save check"}
    </button>
  );
}

export function SaveCheckButton({
  pondId,
  numbers,
}: {
  pondId: string;
  numbers: { fishCount: number; days: number; startG: number; currentG: number; feedKg: number };
}) {
  const [state, formAction] = useFormState(saveCheck, null);

  if (state?.saved) {
    return (
      <div className="flex flex-wrap items-center gap-3" role="status">
        <span className="flex h-12 items-center gap-2 rounded-input bg-success-bg px-4 font-medium text-success">
          <span aria-hidden="true">✓</span> Saved.
        </span>
        <Link
          href="/check/history"
          className="flex h-12 items-center rounded-input border border-border bg-surface px-4 font-medium text-text"
        >
          View history
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="pondId" value={pondId} />
      <input type="hidden" name="fishCount" value={String(numbers.fishCount)} />
      <input type="hidden" name="days" value={String(numbers.days)} />
      <input type="hidden" name="startG" value={String(numbers.startG)} />
      <input type="hidden" name="currentG" value={String(numbers.currentG)} />
      <input type="hidden" name="feedKg" value={String(numbers.feedKg)} />
      <SubmitButton />
      {state?.error ? (
        <p
          role="alert"
          className="rounded-input border border-danger bg-danger-bg p-3 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
