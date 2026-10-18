import { DataSourceBadge, type BadgeState } from "./DataSourceBadge";
import { fmtWeekday } from "@/lib/format";
import { pondWeatherAlert } from "@/lib/weather/alerts";
import type { WeatherResult } from "@/lib/weather/service";

// Weather card (kept from step 2): current conditions, 5-day strip with rain
// chance, the pond alert line, and a real error state with Retry.

/// Badge for a successful load. An error state has no data at all, so it shows
/// no badge — "Saved data" would claim a snapshot that does not exist.
export function weatherBadge(weather: WeatherResult): BadgeState | null {
  if (!weather.ok) return null;
  const ageMinutes = (Date.now() - Date.parse(weather.fetchedAt)) / 60_000;
  return weather.live ? { kind: "live", ageMinutes } : { kind: "saved", ageMinutes };
}

interface WeatherCardProps {
  weather: WeatherResult;
  coords: string;
  providerName?: string;
  /** Shown in the error state so Retry always has somewhere to go. */
  retryHref?: string;
}

export function WeatherCard({ weather, coords, providerName, retryHref = "/weather" }: WeatherCardProps) {
  const alert = weather.ok ? pondWeatherAlert(weather.daily) : null;
  const badge = weatherBadge(weather);

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Weather</h3>
          <p className="text-sm text-muted">
            {coords}
            {providerName ? <> · {providerName}</> : null}
          </p>
        </div>
        {badge ? <DataSourceBadge state={badge} /> : null}
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
                <p className="tabular-nums text-muted">{Math.round(day.rainChancePct)}%</p>
                <p className="tabular-nums text-muted">{day.rainMm} mm</p>
              </li>
            ))}
          </ul>
          {alert ? (
            <p className="mt-3 rounded-input border border-warning bg-warning-bg p-2 text-sm font-medium text-warning">
              <span aria-hidden="true">!</span> {alert}
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-3 rounded-input border border-danger bg-danger-bg p-3">
          <p className="font-medium text-danger">Weather unavailable</p>
          <p className="text-sm text-muted">{weather.error}</p>
          <a
            href={retryHref}
            className="mt-2 inline-flex h-12 items-center rounded-input bg-accent px-4 font-medium text-white"
          >
            Retry
          </a>
        </div>
      )}
    </div>
  );
}
