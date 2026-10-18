import Link from "next/link";
import { SignupForm } from "@/components/AuthForms";
import { FishIcon } from "@/components/icons";

// Signup screen (design.md S-SIGNUP-W): name, email, password with the rule
// shown under the field, and a back path to login.
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <FishIcon className="h-10 w-10 text-accent" />
          <h1 className="mt-2 text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-muted">
            One account holds your farm, your ponds and your checks.
          </p>
        </div>

        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <SignupForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Decision-support tool. You decide.
        </p>
        <p className="mt-2 text-center text-sm text-muted">
          <Link href="/login" className="underline underline-offset-2">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
