import { WEATHER_ALERTS } from "../config";
import type { DailyForecast } from "./schemas";

/// The pond feeding alert (docs/02-pondscale.md): maxC ≥ 34 (any forecast
/// day) or rain ≥ 20 mm tomorrow → feed 10% less today. Shown beside the FCR
/// status; it never changes the status itself. Thresholds live in
/// /lib/config.ts and are SAMPLE numbers pending expert review.
export const POND_FEED_ALERT =
  "Fish eat less on hot or stormy days. Feed 10% less today.";

export function pondWeatherAlert(daily: readonly DailyForecast[]): string | null {
  const { HEAT_MAX_C, HEAVY_RAIN_MM } = WEATHER_ALERTS;
  const hotDay = daily.some((day) => day.maxC >= HEAT_MAX_C);
  // daily[0] is today, daily[1] is tomorrow (providers return APP_TZ days).
  const wetTomorrow = daily[1] !== undefined && daily[1].rainMm >= HEAVY_RAIN_MM;
  return hotDay || wetTomorrow ? POND_FEED_ALERT : null;
}

/// The tip for a calm forecast (docs/02-pondscale.md step 5, weather page).
export const FINE_FEED_TIP = "Weather looks fine for feeding today.";

/**
 * The farm tip that follows the forecast: the feeding advice whenever a hot
 * or stormy day is coming, otherwise the calm sentence. Pure — the page
 * passes the forecast it already has.
 */
export function farmTip(daily: readonly DailyForecast[]): string {
  return pondWeatherAlert(daily) ?? FINE_FEED_TIP;
}