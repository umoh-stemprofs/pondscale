import { Crop } from "@prisma/client";
import Link from "next/link";
import { Suspense } from "react";
import { FishPriceCards } from "@/components/FishPriceCards";
import type { BadgeState } from "@/components/DataSourceBadge";
import { ChartCard, ChartSkeleton } from "@/components/charts/ChartCard";
import { PriceHistoryChart } from "@/components/charts/PriceHistoryChart";
import { priceTableData, type PricePoint } from "@/components/charts/tables";
import { marketDaysSchema } from "@/lib/market/query";
import { getMarketProvider } from "@/lib/market/provider";
import { loadPriceCards } from "@/lib/market/view";
import { requireUser } from "@/lib/guards";

// Market screen (docs/02-pondscale.md step 5): today's tilapia and catfish
// cards with their data-source badge, plus a line chart over 7 / 30 / 90
// days. The range lives in the URL (Zod-validated), so links are shareable;
// "View as table" shows the same quotes the lines draw.
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;

/// The chart data, streamed behind the skeleton while the provider answers.
async function PriceHistorySection({ days }: { days: number }) {
  let points: PricePoint[] = [];
  let badge: BadgeState = { kind: "simulated" };
  let failed = false;

  try {
    const provider = getMarketProvider();
    const [tilapia, catfish] = await Promise.all([
      provider.getHistory(Crop.TILAPIA, days),
      provider.getHistory(Crop.CATFISH, days),
    ]);
    const catfishByDate = new Map(catfish.map((quote) => [quote.date, quote.priceKobo]));
    points = tilapia
      .filter((quote) => catfishByDate.has(quote.date))
      .map((quote) => ({
        date: quote.date,
        tilapiaKobo: quote.priceKobo,
        catfishKobo: catfishByDate.get(quote.date) as number,
      }));
    // Tell the truth about the source (docs/00-global.md §3).
    badge =
      tilapia[0]?.source === "LIVE" ? { kind: "live", ageMinutes: 0 } : { kind: "simulated" };
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <p
        role="alert"
        className="rounded-card border border-warning bg-warning-bg p-3 text-sm font-medium text-warning"
      >
        Price history is unavailable right now. Try again in a few minutes.
      </p>
    );
  }

  return (
    <ChartCard
      title={`Fish prices, last ${days} days`}
      badge={badge}
      table={priceTableData(points)}
      empty={{
        sentence: "No price history to show yet.",
        buttonLabel: "Try again",
        buttonHref: `/market?days=${days}`,
      }}
    >
      <PriceHistoryChart points={points} />
    </ChartCard>
  );
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  await requireUser();

  const parsedDays = marketDaysSchema.safeParse({ days: searchParams.days });
  const days = parsedDays.success ? parsedDays.data.days : 30;
  const cards = await loadPriceCards();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Fish prices</h1>
        <p className="text-muted">
          Today&apos;s price per kilogram. The badge on each card says where the price came from.
        </p>
      </header>

      <div className="max-w-2xl">
        <FishPriceCards cards={cards} />
      </div>

      <section aria-label="Price history" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Price history</h2>
          <nav aria-label="Chart range" className="flex gap-2">
            {RANGES.map((range) => (
              <Link
                key={range}
                href={`/market?days=${range}`}
                aria-current={range === days ? "page" : undefined}
                className={`flex h-10 items-center rounded-full px-4 text-sm font-medium ${
                  range === days
                    ? "bg-accent text-white"
                    : "border border-border bg-surface text-text"
                }`}
              >
                {range} days
              </Link>
            ))}
          </nav>
        </div>
        <Suspense fallback={<ChartSkeleton />}>
          <PriceHistorySection days={days} />
        </Suspense>
      </section>
    </div>
  );
}
