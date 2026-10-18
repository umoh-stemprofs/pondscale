import Link from "next/link";
import { LoginForm } from "@/components/AuthForms";
import { FishIcon } from "@/components/icons";
import { safeNextPath } from "@/lib/auth";

// Login screen (design.md S-LOGIN-W). The "Try demo account" button only
// exists when DEMO_MODE=true. The footer repeats the required disclaimer.
export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; expired?: string };
}) {
  const next = safeNextPath(searchParams.next);
  const demoMode = process.env.DEMO_MODE === "true";
  const expired = searchParams.expired === "1";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <FishIcon className="h-10 w-10 text-accent" />
          <h1 className="mt-2 text-2xl font-semibold">PondScale</h1>
          <p className="mt-1 text-muted">
            Track feed, growth and the value of the fish in your ponds.
          </p>
        </div>

        {expired ? (
          <p
            role="status"
            className="mb-4 rounded-card border border-warning bg-warning-bg p-3 text-sm font-medium text-warning"
          >
            Your session ended — log in again.
          </p>
        ) : null}

        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <LoginForm next={next} demoMode={demoMode} />
        </div>

        <p className="mt-6 text-center text-sm text-muted">Decision-support tool. You decide.</p>
        <p className="mt-2 text-center text-sm text-muted">
          <Link href="/signup" className="underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
