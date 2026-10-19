import Link from "next/link";
import { DataSourceBadge, type BadgeState } from "@/components/DataSourceBadge";
import { WeatherCard } from "@/components/WeatherCard";
import { GearIcon } from "@/components/icons";
import { farmTip } from "@/lib/weather/alerts";
import { getOrCreateFarm, requireUser } from "@/lib/guards";
import { loadFarmWeather, type FarmWeather } from "@/lib/weather/view";

/// The tip follows the forecast, so it carries the same Live / Saved badge
/// as the weather it was derived from (design.md §2).
function tipBadge(weather: FarmWeather["result"]): BadgeState {
  if (!weather.ok) return { kind: "simulated" };
  const ageMinutes = Math.max(
    0,
    Math.round((Date.now() - Date.parse(weather.fetchedAt)) / 60_000),
  );
  return weather.live ? { kind: "live", ageMinutes } : { kind: "saved", ageMinutes };
}

// Weather screen (docs/02-pondscale.md page 3): the forecast for the farm's
// own coordinates, with "Change location" going to farm settings. Still shows
// weather when the farm lookup fails, using the default coordinates.
export const dynamic = "force-dynamic";

export default async function WeatherPage() {
  const userId = await requireUser();

  let farm: { id: string; lat: number; lon: number } | null = null;
  try {
    const row = await getOrCreateFarm(userId);
    farm = { id: row.id, lat: row.lat, lon: row.lon };
  } catch {
    farm = null;
  }

  const weather = await loadFarmWeather(farm);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Weather</h1>
          <p className="text-muted">The forecast for your farm, refreshed every 30 minutes.</p>
        </div>
        <Link
          href="/settings"
          className="flex h-12 items-center gap-2 rounded-input border border-border bg-surface px-4 font-medium"
        >
          <GearIcon className="h-4 w-4" />
          Change location
        </Link>
      </header>

      <div className="max-w-2xl space-y-6">
        <WeatherCard
          weather={weather.result}
          coords={weather.coordsLabel}
          providerName={weather.providerName}
          retryHref="/weather"
        />

        {weather.result.ok ? (
          <section
            aria-label="Farm tip"
            className="rounded-card border border-border bg-surface p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold">Farm tip</h2>
              <DataSourceBadge state={tipBadge(weather.result)} />
            </div>
            <p className="mt-2 text-base">{farmTip(weather.result.daily)}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
