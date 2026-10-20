"use client";

// Error boundary for every page (docs/00-global.md §6: bad states show one
// sentence, never a crash or a raw error). Errors are logged server-side for
// debugging; the farmer only ever sees plain words and a way forward.

import Link from "next/link";
import { useEffect } from "react";
import { AlertIcon, FishIcon } from "@/components/icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server log only — the message never reaches the screen.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <FishIcon className="mx-auto h-8 w-8 text-muted" />
        <h1 className="mt-3 text-xl font-semibold">Something went wrong on that page</h1>
        <p className="mt-2 text-muted">
          <AlertIcon className="mr-1 inline h-4 w-4" />
          It is not your fault, and nothing was saved. Try again in a moment.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex h-12 items-center justify-center rounded-input bg-accent px-4 font-medium text-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="flex h-12 items-center justify-center rounded-input border border-border bg-surface px-4 font-medium text-text"
          >
            Back to dashboard
          </Link>
        </div>
        <p className="mt-5 text-sm text-muted">Decision-support tool. You decide.</p>
      </div>
    </main>
  );
}
