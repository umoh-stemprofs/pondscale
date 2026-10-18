// Shared app config (docs/00-global.md §3). Thresholds are SAMPLE values and
// must be reviewed by an expert before any real use.

export const APP_TZ = process.env.APP_TZ ?? "Africa/Lagos";

// Weather (docs/00-global.md §3): server-only calls, 5 s timeout, one retry,
// cache in WeatherSnapshot for 30 minutes.
export const WEATHER_TIMEOUT_MS = 5_000;
export const WEATHER_RETRIES = 1;
export const WEATHER_CACHE_MINUTES = 30;

/// Sample alert thresholds. The pond feeding alert uses HEAT_MAX_C and
/// HEAVY_RAIN_MM (docs/02-pondscale.md); DAMP_HUMIDITY is kept for the
/// dashboard alerts in a later step.
export const WEATHER_ALERTS = {
  HEAT_MAX_C: 34,
  HEAVY_RAIN_MM: 20,
  DAMP_HUMIDITY: 80,
} as const;

/// Default farm location: Port Harcourt (docs/00-global.md §3).
export const DEFAULT_FARM_LOCATION = {
  name: "Port Harcourt",
  lat: 4.8156,
  lon: 7.0498,
} as const;

/// GET /api/market/history accepts at most 90 days (docs/00-global.md §3).
export const MARKET_HISTORY_MAX_DAYS = 90;