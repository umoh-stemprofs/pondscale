// History charts for the chosen pond (step 5), as an async server component
// so the page can stream them behind a ChartSkeleton while the database
// answers. Ownership is part of both queries: the pond must belong to the
// farm, and the checks are listed through listChecksForFarm.

import { listChecksForFarm, type SavedCheck } from "@/lib/check/service";
import { fcrSeries, growthSeries } from "@/lib/charts/series";
import { SPECIES_LIMITS } from "@/lib/config";
import { db } from "@/lib/db";
import { pondForFarm, type OwnedPond } from "@/lib/ownership";
import { ChartCard } from "./ChartCard";
import { FcrLineChart } from "./FcrLineChart";
import { GrowthLineChart } from "./GrowthLineChart";
import { fcrTableData, growthTableData } from "./tables";

const CHECK_EMPTY = {
  sentence: "No saved checks yet — record a check to see the trend.",
  buttonLabel: "Check my fish",
  buttonHref: "/check",
};

/// "Saved data · X old" — the chart shows checks that were saved on this
/// farm, so the saved badge tells the truth (design.md §2).
function savedBadge(checks: SavedCheck[]): { kind: "saved"; ageMinutes: number } {
  const newest = checks.reduce<SavedCheck | null>(
    (best, check) => (best === null || check.createdAt > best.createdAt ? check : best),
    null,
  );
  const minutes = newest ? Math.max(0, Math.round((Date.now() - newest.createdAt.getTime()) / 60_000)) : 0;
  return { kind: "saved", ageMinutes: minutes };
}

export async function PondTrendCharts({ farmId, pondId }: { farmId: string; pondId: string }) {
  let pond: OwnedPond | null = null;
  let checks: SavedCheck[] = [];
  let dbDown = false;

  try {
    pond = await pondForFarm(db, pondId, farmId);
    if (pond) checks = await listChecksForFarm(db, { farmId, pondId });
  } catch {
    dbDown = true;
  }

  if (dbDown) {
    return (
      <p
        role="alert"
        className="rounded-card border border-warning bg-warning-bg p-3 text-sm font-medium text-warning"
      >
        Cannot reach the database right now, so the charts could not be loaded. Try again in a
        moment.
      </p>
    );
  }
  if (!pond) return null;

  const limits = SPECIES_LIMITS[pond.species];
  const fcr = fcrSeries(checks);
  const growth = growthSeries(checks);
  const badge = savedBadge(checks);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="FCR over time" badge={badge} table={fcrTableData(fcr)} empty={CHECK_EMPTY}>
        <FcrLineChart points={fcr} fcrMax={limits.fcrMax} />
      </ChartCard>
      <ChartCard title="Growth in g per day" badge={badge} table={growthTableData(growth)} empty={CHECK_EMPTY}>
        <GrowthLineChart points={growth} adgMin={limits.adgMin} />
      </ChartCard>
    </div>
  );
}
