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
