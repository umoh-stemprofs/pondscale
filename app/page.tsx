import { CheckStatus, Crop } from "@prisma/client";
import { DataSourceBadge, type BadgeState } from "@/components/DataSourceBadge";
import { db } from "@/lib/db";
import { todayIso } from "@/lib/dates";
import { getMarketProvider, type MarketQuote } from "@/lib/market/provider";
import { pondWeatherAlert } from "@/lib/weather/alerts";
import { getWeather, prismaSnapshotStore, type WeatherResult } from "@/lib/weather/service";

// Step 1 + 2 check: proves schema, seed, the market feed and the weather
// provider work through the app. Replaced by the dashboard in a later step,
// so it is deliberately plain.
export const dynamic = "force-dynamic";

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

// design.md §2: status is never colour alone — icon + word, too.
const STATUS: Record<CheckStatus, { label: string; icon: string; cls: string }> = {
  GOOD: { label: "Good", icon: "✓", cls: "bg-success-bg text-success" },
  SLOW_GROWTH: { label: "Slow growth", icon: "!", cls: "bg-warning-bg text-warning" },
  TOO_MUCH_FEED: { label: "Too much feed", icon: "!", cls: "bg-warning-bg text-warning" },
  CHECK_NUMBERS: { label: "Check numbers", icon: "×", cls: "bg-danger-bg text-danger" },
  NO_GROWTH: { label: "No growth", icon: "×", cls: "bg-danger-bg text-danger" },
};

const fmtDay = (input: string | Date) => {
  const iso = typeof input === "string" ? input : input.toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

const fmtWeekday = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
};

function quoteBadge(quote: MarketQuote): BadgeState {
  return quote.source === "LIVE" ? { kind: "live", ageMinutes: 0 } : { kind: "simulated" };
}

export default async function StepTwoCheck() {
  let content: React.ReactNode;

  try {
    const farm = await db.farm.findFirst({
      orderBy: { createdAt: "asc" },
      include: {
        user: true,
        feedPrices: true,
        ponds: {
          orderBy: { name: "asc" },
          include: { checks: { orderBy: { date: "desc" }, take: 1 } },
        },
      },
    });

    if (!farm) {
      content = (
        <p className="text-muted">
          Database is reachable but empty. Run <code>npm run db:seed</code>.
        </p>
      );
    } else {
      // --- Market feed (server-side) -------------------------------------
      const provider = getMarketProvider();
      let fishPrices: React.ReactNode;
      try {
        const quotes = await provider.getPrices();
        const today = todayIso();
        const cards = await Promise.all(
          [Crop.TILAPIA, Crop.CATFISH].map(async (crop) => {
            const quote = quotes.find((q) => q.crop === crop);
            if (!quote) return null;
            const history = await provider.getHistory(crop, 2);
            const previous = history[history.length - 2];
            const changePct =
              previous && previous.priceKobo > 0
                ? Math.round(((quote.priceKobo - previous.priceKobo) / previous.priceKobo) * 1000) / 10
                : null;
            return { crop, quote, changePct };
          }),
        );
        fishPrices = (
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card) =>
              card ? (
                <div
                  key={card.crop}
                  className="rounded-card border border-border bg-surface p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-muted">{card.crop}</p>
                    <DataSourceBadge state={quoteBadge(card.quote)} />
                  </div>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {naira(card.quote.priceKobo)}/{card.quote.unit === "KG" ? "kg" : card.quote.unit.toLowerCase()}
                  </p>
                  <p className="text-sm text-muted">
                    {card.changePct === null
                      ? `as of ${fmtDay(card.quote.date)}`
                      : `${card.changePct > 0 ? "↑" : card.changePct < 0 ? "↓" : "→"} ${
                          card.changePct > 0 ? "+" : ""
                        }${card.changePct}% vs yesterday · as of ${fmtDay(card.quote.date)}`}
                  </p>
                </div>
              ) : null,
            )}
            {cards.every((card) => card === null) ? (
              <p className="text-muted">Prices are unavailable right now.</p>
            ) : null}
          </div>
        );
        void today;
      } catch {
        fishPrices = <p className="text-muted">Prices are unavailable right now.</p>;
      }

      // --- Weather (server-only, cached 30 min) ---------------------------
      let weather: WeatherResult;
      try {
        weather = await getWeather({ farmId: farm.id, lat: farm.lat, lon: farm.lon });
      } catch {
        weather = { ok: false, error: "Weather is unavailable right now. Try again in a few minutes." };
      }
      const weatherBadge: BadgeState = weather.ok
        ? weather.live
          ? { kind: "live", ageMinutes: (Date.now() - Date.parse(weather.fetchedAt)) / 60_000 }
          : { kind: "saved", ageMinutes: (Date.now() - Date.parse(weather.fetchedAt)) / 60_000 }
        : { kind: "saved", ageMinutes: 0 };
      const weatherAlert = weather.ok ? pondWeatherAlert(weather.daily) : null;

      // --- Ponds table ----------------------------------------------------
      const checks = farm.ponds.map((p) => p.checks[0]).filter(Boolean);
      const totalStock = checks.reduce((sum, c) => sum + c.stockValueKobo, 0);
      const feedPrice = farm.feedPrices[0];

      content = (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">{farm.name}</h2>
            <p className="text-muted">
              {farm.user.name} · {farm.lat}, {farm.lon} · {farm.currency}
              {feedPrice ? <> · feed {naira(feedPrice.priceKobo)}/kg</> : null}
            </p>
          </div>

          <section aria-label="Market prices" className="space-y-2">
            <h3 className="font-semibold">Market prices</h3>
            {fishPrices}
          </section>

          <section aria-label="Weather">
            <div className="rounded-card border border-border bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Weather</h3>
                  <p className="text-sm text-muted">
                    {farm.lat}, {farm.lon}
                    {weather.ok ? (
                      <>
                        {" · "}
                        {weather.source === "openweathermap" ? "OpenWeatherMap" : "Open-Meteo"}
                      </>
                    ) : null}
                  </p>
                </div>
                <DataSourceBadge state={weatherBadge} />
              </div>

              {weather.ok ? (
                <>
                  <p className="mt-3 text-2xl font-bold tabular-nums">
                    {Math.round(weather.current.tempC)}°C{" "}
                    <span className="text-base font-medium text-muted">{weather.current.text}</span>
                  </p>
                  <p className="text-sm text-muted">
                    Humidity {Math.round(weather.current.humidity)}% · Wind{" "}
                    {Math.round(weather.current.windKmh * 10) / 10} km/h
                  </p>
                  <ul className="mt-3 grid grid-cols-5 gap-2 text-center text-sm">
                    {weather.daily.map((day) => (
                      <li key={day.date} className="rounded-input border border-border p-2">
                        <p className="font-medium">{fmtWeekday(day.date)}</p>
                        <p className="tabular-nums">
                          {Math.round(day.maxC)}° / {Math.round(day.minC)}°
                        </p>
                        <p className="text-muted tabular-nums">{day.rainMm} mm</p>
                      </li>
                    ))}
                  </ul>
                  {weatherAlert ? (
                    <p className="mt-3 rounded-input border border-warning bg-warning-bg p-2 text-sm font-medium text-warning">
                      <span aria-hidden="true">!</span> {weatherAlert}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="mt-3 rounded-input border border-danger bg-danger-bg p-3">
                  <p className="font-medium text-danger">Weather unavailable</p>
                  <p className="text-sm text-muted">{weather.error}</p>
                  <a
                    href="/"
                    className="mt-2 inline-flex h-12 items-center rounded-input bg-accent px-4 font-medium text-white"
                  >
                    Retry
                  </a>
                </div>
              )}
            </div>
          </section>

          <section aria-label="Ponds" className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <table className="w-full text-left">
              <caption className="sr-only">Seeded ponds, one per check status</caption>
              <thead className="border-b border-border text-sm text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Pond</th>
                  <th scope="col" className="px-4 py-3 font-medium">Species</th>
                  <th scope="col" className="px-4 py-3 font-medium">Last check</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">FCR</th>
                  <th scope="col" className="px-4 py-3 font-medium">Feed cost / kg gained</th>
                  <th scope="col" className="px-4 py-3 font-medium">Stock value</th>
                </tr>
              </thead>
              <tbody>
                {farm.ponds.map((pond) => {
                  const check = pond.checks[0];
                  const status = check ? STATUS[check.status] : null;
                  return (
                    <tr key={pond.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{pond.name}</td>
                      <td className="px-4 py-3">{pond.species}</td>
                      <td className="px-4 py-3">{check ? fmtDay(check.date) : "—"}</td>
                      <td className="px-4 py-3">
                        {check && status ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${status.cls}`}>
                            <span aria-hidden="true">{status.icon}</span> {status.label}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{check?.fcr != null ? check.fcr.toFixed(2) : "—"}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {check?.feedCostPerKgGainKobo != null ? naira(check.feedCostPerKgGainKobo) : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {check ? naira(check.stockValueKobo) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <p className="text-sm text-muted">
            {farm.ponds.length} ponds · {checks.length} saved checks · total stock value{" "}
            <span className="font-medium text-text">{naira(totalStock)}</span>. Prices come from the
            market feed, weather from Open-Meteo (no key) or OpenWeatherMap if configured.
          </p>
        </div>
      );
    }
  } catch (error) {
    content = (
      <div className="rounded-card border border-danger bg-danger-bg p-4">
        <p className="font-medium text-danger">Cannot reach the database</p>
        <p className="text-muted">
          Check DATABASE_URL in .env, then run <code>npm run db:migrate</code> and{" "}
          <code>npm run db:seed</code>.
        </p>
        <p className="mt-2 text-sm text-muted">{String(error)}</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium text-accent">Step 2 check</p>
        <h1 className="text-3xl font-bold">PondScale</h1>
        <p className="mt-1 text-muted">
          Is my fish feed right? Schema, seed, market feed and weather are in place. This page is
          temporary.
        </p>
      </header>
      {content}
    </main>
  );
}