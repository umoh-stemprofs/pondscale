import type { CheckStatus } from "@prisma/client";
import { STATUS_META } from "@/lib/status";

// Status pill (design.md §2 and §1): colour + icon + word, never colour alone.

export function StatusPill({ status }: { status: CheckStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${meta.cls}`}
    >
      <span aria-hidden="true">{meta.icon}</span> {meta.label}
    </span>
  );
}

/// Large variant for the result screens (docs/02-pondscale.md step 4B): the
/// same colour + icon + word rule, sized to be the headline of the page.
export function StatusPillLarge({ status }: { status: CheckStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-lg font-semibold ${meta.cls}`}
    >
      <span aria-hidden="true">{meta.icon}</span> {meta.label}
    </span>
  );
}
