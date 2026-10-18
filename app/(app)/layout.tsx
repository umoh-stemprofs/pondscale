import { AppShell } from "@/components/AppShell";
import { requireAccount } from "@/lib/guards";

// Every screen inside this group uses the dashboard shell (sidebar on
// desktop, top bar on tablet, bottom nav on phone) and needs a session.
// middleware.ts is the first gate; this layout re-checks on the server
// (docs/00-global.md §3: never trust the UI alone).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAccount();
  return <AppShell>{children}</AppShell>;
}
