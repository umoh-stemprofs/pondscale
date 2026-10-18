"use client";

// Pond list + actions (docs/02-pondscale.md step 4A: ponds screen). All three
// actions re-check the session and ownership on the server; this component
// only collects the input and shows the returned sentence. Delete goes
// through a confirm dialog with verb labels (design.md §2).

import type { CheckStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addPond, deletePond, renamePond } from "@/lib/actions/ponds";
import type { FormState } from "@/lib/auth";
import { fmtDay, fmtFcr } from "@/lib/format";
import { ConfirmDialog } from "./ConfirmDialog";
import { FishIcon, PencilIcon, PlusIcon, TrashIcon } from "./icons";
import { StatusPill } from "./StatusPill";

type SpeciesKey = "TILAPIA" | "CATFISH";

export interface PondSummary {
  id: string;
  name: string;
  species: SpeciesKey;
  lastCheck: { date: string; status: CheckStatus; fcr: number | null } | null;
}

const SPECIES_LABEL: Record<SpeciesKey, string> = { TILAPIA: "Tilapia", CATFISH: "Catfish" };

const inputCls =
  "h-12 w-full rounded-input border border-border bg-surface px-3 text-base outline-none focus:border-accent";
const labelCls = "block text-sm font-medium text-text";
const primaryCls =
  "flex h-12 items-center justify-center gap-2 rounded-input bg-accent px-4 font-medium text-white disabled:opacity-60";
const secondaryCls =
  "flex h-12 items-center justify-center gap-2 rounded-input border border-border bg-surface px-4 font-medium text-text disabled:opacity-60";

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-input border border-danger bg-danger-bg p-3 text-sm font-medium text-danger">
      {error}
    </p>
  );
}

export function PondManager({ ponds }: { ponds: PondSummary[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [adding, setAdding] = useState(ponds.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PondSummary | null>(null);

  async function run(
    action: (prev: FormState, data: FormData) => Promise<FormState>,
    data: FormData,
  ): Promise<FormState> {
    setPending(true);
    setError(null);
    try {
      const result = await action(null, data);
      if (result?.error) {
        setError(result.error);
        return result;
      }
      router.refresh();
      return result;
    } catch {
      setError("Could not save just now — try again.");
      return { error: "Could not save just now — try again." };
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorLine error={error} /> : null}

      {adding ? (
        <form
          className="space-y-3 rounded-card border border-border bg-surface p-4 shadow-card"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            void run(addPond, new FormData(form)).then((result) => {
              if (!result?.error) {
                form.reset();
                setAdding(false);
              }
            });
          }}
        >
          <h2 className="font-semibold">Add a pond</h2>
          <div>
            <label htmlFor="pond-name" className={labelCls}>
              Pond name
            </label>
            <input
              id="pond-name"
              name="name"
              required
              maxLength={40}
              placeholder="Pond 1"
              className={`mt-1 ${inputCls}`}
            />
          </div>
          <div>
            <label htmlFor="pond-species" className={labelCls}>
              Fish
            </label>
            <select id="pond-species" name="species" className={`mt-1 ${inputCls}`}>
              <option value="TILAPIA">Tilapia</option>
              <option value="CATFISH">Catfish</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={pending} className={primaryCls}>
              <PlusIcon className="h-4 w-4" />
              {pending ? "Saving…" : "Save pond"}
            </button>
            {ponds.length > 0 ? (
              <button type="button" onClick={() => setAdding(false)} className={secondaryCls}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={primaryCls}>
          <PlusIcon className="h-4 w-4" />
          Add pond
        </button>
      )}

      {ponds.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-8 text-center shadow-card">
          <FishIcon className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 font-medium">No ponds yet</p>
          <p className="text-sm text-muted">
            Add a pond above, then record a check after a week of feeding.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {ponds.map((pond) => (
            <li key={pond.id} className="rounded-card border border-border bg-surface p-4 shadow-card">
              {editingId === pond.id ? (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    data.set("pondId", pond.id);
                    void run(renamePond, data).then((result) => {
                      if (!result?.error) setEditingId(null);
                    });
                  }}
                >
                  <div>
                    <label htmlFor={`rename-${pond.id}`} className={labelCls}>
                      Pond name
                    </label>
                    <input
                      id={`rename-${pond.id}`}
                      name="name"
                      defaultValue={pond.name}
                      required
                      maxLength={40}
                      className={`mt-1 ${inputCls}`}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="submit" disabled={pending} className={primaryCls}>
                      {pending ? "Saving…" : "Save name"}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className={secondaryCls}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{pond.name}</p>
                    <p className="text-sm text-muted">{SPECIES_LABEL[pond.species]}</p>
                    <p className="mt-2 text-sm text-muted">
                      {pond.lastCheck ? (
                        <>
                          Last check {fmtDay(pond.lastCheck.date)} · FCR{" "}
                          {fmtFcr(pond.lastCheck.fcr)}
                        </>
                      ) : (
                        "No check yet."
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {pond.lastCheck ? <StatusPill status={pond.lastCheck.status} /> : null}
                    <button
                      type="button"
                      onClick={() => setEditingId(pond.id)}
                      className="flex h-11 items-center gap-2 rounded-input border border-border px-3 font-medium"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(pond)}
                      className="flex h-11 items-center gap-2 rounded-input border border-danger px-3 font-medium text-danger"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete pond
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? "this pond"}?`}
        body="The pond and all of its saved checks will be removed. This cannot be undone."
        confirmLabel="Delete pond"
        cancelLabel="Keep pond"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const pond = deleting;
          setDeleting(null);
          if (!pond) return;
          const data = new FormData();
          data.set("pondId", pond.id);
          void run(deletePond, data);
        }}
      />
    </div>
  );
}
