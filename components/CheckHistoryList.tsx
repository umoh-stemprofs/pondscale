"use client";

// Saved-check list with delete (docs/02-pondscale.md step 4B history). The
// server actions re-check the session and ownership; this component only
// collects the choice and shows the returned sentence. Delete goes through a
// confirm dialog with verb labels, never Yes/No (design.md §2).

import type { CheckStatus } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCheck } from "@/lib/actions/checks";
import type { FormState } from "@/lib/auth";
import { fmtDay, fmtFcr } from "@/lib/format";
import { ConfirmDialog } from "./ConfirmDialog";
import { TrashIcon } from "./icons";
import { StatusPill } from "./StatusPill";

export interface CheckRowData {
  id: string;
  pondId: string;
  pondName: string;
  date: string; // YYYY-MM-DD
  status: CheckStatus;
  fcr: number | null;
  adgGPerDay: number;
}

const dangerErrorCls =
  "rounded-input border border-danger bg-danger-bg p-3 text-sm font-medium text-danger";

export function CheckHistoryList({ rows }: { rows: CheckRowData[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState<CheckRowData | null>(null);

  if (rows.length === 0) return null; // the page renders its own empty state

  async function runDelete(checkId: string): Promise<void> {
    setPending(true);
    setError(null);
    const data = new FormData();
    data.set("checkId", checkId);
    const result: FormState = await deleteCheck(null, data);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className={dangerErrorCls}>
          {error}
        </p>
      ) : null}
      {pending ? (
        <p role="status" className="text-sm text-muted">
          Deleting…
        </p>
      ) : null}

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-card border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  <Link href={`/check/history/${row.id}`} className="hover:text-accent">
                    {row.pondName}
                  </Link>
                </p>
                <p className="text-sm text-muted">
                  {fmtDay(row.date)} · FCR {fmtFcr(row.fcr)} · growth{" "}
                  {row.adgGPerDay.toFixed(2)} g per fish per day
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={row.status} />
                <Link
                  href={`/check/history/${row.id}`}
                  className="flex h-11 items-center rounded-input border border-border px-3 font-medium text-text"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleting(row)}
                  aria-label={`Delete the ${fmtDay(row.date)} check for ${row.pondName}`}
                  className="flex h-11 w-11 items-center justify-center rounded-input border border-danger text-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this check?"
        body={`The saved numbers for ${deleting?.pondName ?? "this pond"}${
          deleting ? ` on ${fmtDay(deleting.date)}` : ""
        } will be removed. This cannot be undone.`}
        confirmLabel="Delete check"
        cancelLabel="Keep check"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const row = deleting;
          setDeleting(null);
          if (row) void runDelete(row.id);
        }}
      />
    </div>
  );
}
