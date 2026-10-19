import type { CheckStatus, Farm, Species } from "@prisma/client";
import Link from "next/link";
import { FishPriceCards } from "@/components/FishPriceCards";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";
import { WeatherCard } from "@/components/WeatherCard";
import { FishIcon, PlusIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { fmtCount, fmtDay, fmtFcr, naira, speciesLabel } from "@/lib/format";
import { loadPriceCards } from "@/lib/market/view";
import { getOrCreateFarm, requireUser } from "@/lib/guards";
import { pondWeatherAlert } from "@/lib/weather/alerts";
import { loadFarmWeather } from "@/lib/weather/view";

// Dashboard (design.md S-DASH, docs/02-pondscale.md page 2): 4 stat cards,
// weather, fish prices and a "My ponds" card per pond with its last status.
// Rule 4: the weather card must still show weather when the farm lookup fails,
// so the database read is wrapped and the weather uses the default
// coordinates — and the rest of the page keeps working.
export const dynamic = "force-dynamic";

type PondWithCheck = {
  id: string;
  name: string;
  species: Species;
  checks: {
    date: Date;
    status: CheckStatus;
    fcr: number | null;
    fishCount: number;
    stockValueKobo: number;
    feedCostPerKgGainKobo: number | null;
  }[];
};

export default async function DashboardPage() {
  const userId = await requireUser();

  let farm: Farm | null = null;
  let ponds: PondWithCheck[] = [];
  let dbDown = false;

  try {
    farm = await getOrCreateFarm(userId);
    ponds = (await db.pond.findMany({
      where: { farmId: farm.id },
      orderBy: { name: "asc" },
      include: {
        checks: {
          orderBy: { date: "desc" },
          take: 1,
          select: {
            date: true,
            status: true,
            fcr: true,
            fishCount: true,
            stockValueKobo: true,
            feedCostPerKgGainKobo: true,
          },
        },
      },
    })) as PondWithCheck[];
  } catch {
    // Database slow or unreachable: keep the page alive (rule 4) — weather
    // falls back to the default coordinates below.
    dbDown = true;
  }

  // Weather first, with the default location whenever the farm is unknown.
  const weather = await loadFarmWeather(
    farm ? { id: farm.id, lat: farm.lat, lon: farm.lon } : null,
  );
  const weatherAlert = weather.result.ok ? pondWeatherAlert(weather.result.daily) : null;

  // Fish prices: shared with the market page and the value cards.
  const priceCards = await loadPriceCards();

  const latest = ponds
    .map((pond) => pond.checks[0])
    .filter((check): check is PondWithCheck["checks"][number] => Boolean(check));

  const fishInPonds = latest.reduce((sum, check) => sum + check.fishCount, 0);
  const stockValue = latest.reduce((sum, check) => sum + check.stockValueKobo, 0);
  // The most recent check across all ponds (not just the first pond's).
  const newest = latest.reduce<PondWithCheck["checks"][number] | null>(
    (best, check) => (best === null || check.date > best.date ? check : best),
    null,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted">
            {farm ? farm.name : "Your farm"}
            {farm ? ` · ${farm.lat}, ${farm.lon}` : ""}
          </p>
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
          Cannot reach the database right now — your latest pond numbers may be missing. Try again
          in a moment.
        </p>
      ) : null}

      {weatherAlert ? (
        <p
          role="status"
          className="rounded-card border border-warning bg-warning-bg p-3 text-sm font-medium text-warning"
        >
          <span aria-hidden="true">!</span> {weatherAlert}
        </p>
      ) : null}

      <section aria-label="Farm at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ponds"
          value={String(ponds.length)}
          sub={ponds.length === 0 ? "No ponds yet" : `Last check ${newest ? fmtDay(newest.date) : "—"}`}
        />
        <StatCard
          label="Fish in ponds"
          value={fmtCount(fishInPonds)}
          sub="From the latest check on each pond"
        />
        <StatCard
          label="Stock value"
          value={naira(stockValue)}
          sub={
            newest
              ? `As of ${fmtDay(newest.date)} · from fish prices`
              : "Add a check to see the value"
          }
        />
        <StatCard
          label="Feed cost per kg gained"
          value={newest?.feedCostPerKgGainKobo != null ? naira(newest.feedCostPerKgGainKobo) : "—"}
          sub={newest?.fcr != null ? `At FCR ${fmtFcr(newest.fcr)}` : "Needs a check with growth"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-label="My ponds" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">My ponds</h2>
            <div className="flex items-center gap-2">
              <Link
                href="/check/history"
                className="flex h-11 items-center rounded-input border border-border px-3 font-medium text-text"
              >
                History
              </Link>
              <Link
                href="/ponds"
                className="flex h-11 items-center gap-2 rounded-input bg-accent px-3 font-medium text-white"
              >
                <PlusIcon className="h-4 w-4" />
                Add pond
              </Link>
            </div>
          </div>

          {ponds.length === 0 ? (
            <div className="rounded-card border border-border bg-surface p-6 text-center shadow-card">
              <FishIcon className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-2 font-medium">No ponds yet</p>
              <p className="text-sm text-muted">Add your first pond to start checking your feed.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {ponds.map((pond) => {
                const check = pond.checks[0];
                return (
                  <li
                    key={pond.id}
                    className="rounded-card border border-border bg-surface p-4 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{pond.name}</p>
                        <p className="text-sm text-muted">{speciesLabel(pond.species)}</p>
                      </div>
                      {check ? <StatusPill status={check.status} /> : null}
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {check ? (
                        <>
                          Last check {fmtDay(check.date)} · FCR {fmtFcr(check.fcr)} ·{" "}
                          {fmtCount(check.fishCount)} fish ·{" "}
                          {naira(check.stockValueKobo)} stock value
                        </>
                      ) : (
                        "No check yet — add one to see FCR and stock value."
                      )}
                    </p>
                    <Link
                      href={`/check?pond=${pond.id}&step=1`}
                      className="mt-3 inline-flex h-11 items-center rounded-input border border-border px-3 font-medium text-text"
                    >
                      Check this pond
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-label="Weather and prices" className="space-y-6">
          <WeatherCard
            weather={weather.result}
            coords={weather.coordsLabel}
            providerName={weather.providerName}
            retryHref="/"
          />
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Fish prices today</h2>
            <FishPriceCards cards={priceCards} />
          </div>
        </section>
      </div>
    </div>
  );
}
