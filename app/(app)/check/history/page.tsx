import Link from "next/link";
import { Suspense } from "react";
import { CheckHistoryList, type CheckRowData } from "@/components/CheckHistoryList";
import { ChartCard, ChartSkeleton } from "@/components/charts/ChartCard";
import { PondTrendCharts } from "@/components/charts/PondTrendCharts";
import { FishIcon } from "@/components/icons";
import { listChecksForFarm } from "@/lib/check/service";
import { db } from "@/lib/db";
import { getOrCreateFarm, requireUser } from "@/lib/guards";

// Saved-check history (docs/02-pondscale.md step 4B): every check on this
// farm, newest first, filterable per pond. The query is scoped by the farm
// id inside listChecksForFarm, and a ?pond= that is not one of this farmer's
// ponds matches nothing — ownership is the WHERE clause (docs/00-global.md
// §3). The FCR chart over time comes with step 5.
export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { pond?: string };
}) {
  const userId = await requireUser();

  let ponds: { id: string; name: string }[] = [];
  let rows: CheckRowData[] = [];
  let farmId: string | null = null;
  let dbDown = false;

  try {
    const farm = await getOrCreateFarm(userId);
    farmId = farm.id;
    // Speed: the pond list and the check list are independent reads on the
    // same farm, so they run together. The pond filter is applied to the
    // already-scoped rows in memory — every check comes from WHERE farmId.
    const [pondRows, checks] = await Promise.all([
      db.pond.findMany({
        where: { farmId: farm.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      listChecksForFarm(db, { farmId: farm.id }),
    ]);
    ponds = pondRows;
    // Only this farmer's ponds can match the filter; anything else is ignored.
    const pondId = ponds.find((pond) => pond.id === searchParams.pond)?.id;
    const nameOf = new Map(ponds.map((pond) => [pond.id, pond.name]));
    rows = checks
      .filter((check) => pondId === undefined || check.pondId === pondId)
      .map((check) => ({
        id: check.id,
        pondId: check.pondId,
        pondName: nameOf.get(check.pondId) ?? "Pond",
        date: check.date.toISOString().slice(0, 10),
        status: check.status,
        fcr: check.fcr,
        adgGPerDay: check.adgGPerDay,
      }));
  } catch {
    dbDown = true;
  }

  const selectedPondId = ponds.find((pond) => pond.id === searchParams.pond)?.id;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Check history</h1>
          <p className="text-muted">Every saved check, newest first.</p>
        </div>
        <Link
          href="/check"
          className="flex h-12 items-center gap-2 rounded-input bg-accent px-4 font-medium text-white"
        >
          <FishIcon className="h-5 w-5" />
          Check my fish
        </Link>
      </header>

      {dbDown ? (
        <p
          role="alert"
          className="rounded-card border border-warning bg-warning-bg p-3 text-sm font-medium text-warning"
        >
          Cannot reach the database right now, so your saved checks could not be loaded. Try again
          in a moment.
        </p>
      ) : (
        <>
          <nav aria-label="Filter by pond" className="flex flex-wrap gap-2">
            <Link
              href="/check/history"
              aria-current={selectedPondId ? undefined : "page"}
              className={`flex h-11 items-center rounded-full px-4 text-sm font-medium ${
                selectedPondId ? "border border-border bg-surface text-text" : "bg-accent text-white"
              }`}
            >
              All ponds
            </Link>
            {ponds.map((pond) => {
              const active = pond.id === selectedPondId;
              return (
                <Link
                  key={pond.id}
                  href={`/check/history?pond=${pond.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center rounded-full px-4 text-sm font-medium ${
                    active ? "bg-accent text-white" : "border border-border bg-surface text-text"
                  }`}
                >
                  {pond.name}
                </Link>
              );
            })}
          </nav>

          <section aria-label="Trends" className="space-y-3">
            <h2 className="text-lg font-semibold">Trends</h2>
            {selectedPondId && farmId ? (
              // Streams behind the skeleton while the chart rows load.
              <Suspense fallback={<ChartSkeleton />}>
                <PondTrendCharts farmId={farmId} pondId={selectedPondId} />
              </Suspense>
            ) : (
              <ChartCard
                title="FCR over time"
                table={{ head: [], rows: [] }}
                empty={{
                  sentence: "Choose a pond above to see its FCR and growth charts.",
                  buttonLabel: "Check my fish",
                  buttonHref: "/check",
                }}
              >
                {null}
              </ChartCard>
            )}
          </section>

          {rows.length === 0 ? (
            <div className="rounded-card border border-border bg-surface p-8 text-center shadow-card">
              <FishIcon className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-2 font-medium">No saved checks yet</p>
              <p className="text-sm text-muted">
                Record a check after a week of feeding to see it here.
              </p>
              <Link
                href="/check"
                className="mt-4 inline-flex h-12 items-center rounded-input bg-accent px-4 font-medium text-white"
              >
                Check my fish
              </Link>
            </div>
          ) : (
            <CheckHistoryList rows={rows} />
          )}
        </>
      )}
    </div>
  );
}
