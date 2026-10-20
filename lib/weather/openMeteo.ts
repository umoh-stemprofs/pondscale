import { APP_TZ } from "../config";
import { fetchWithTimeoutRetry, type FetchFn } from "./http";
import { openMeteoResponseSchema, type WeatherData } from "./schemas";

// Open-Meteo (default provider, no API key needed):
// GET https://api.open-meteo.com/v1/forecast
// Shape verified with a live call on 2026-10-18 (docs/api.md).

/// WMO weather interpretation codes → plain text.
const WMO_TEXT: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export function wmoText(code: number): string {
  return WMO_TEXT[code] ?? "Unknown conditions";
}

/// Base URL for the forecast endpoint. WEATHER_API_URL exists so the
/// failure path can be tested against any unreachable host (and so a proxy
/// can be used); the default is the real Open-Meteo API.
const BASE_URL = () => process.env.WEATHER_API_URL?.trim() || "https://api.open-meteo.com";

export function openMeteoUrl(lat: number, lon: number, tz: string = APP_TZ): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
    timezone: tz,
    forecast_days: "5",
  });
  return `${BASE_URL()}/v1/forecast?${params.toString()}`;
}

export async function fetchOpenMeteo(
  lat: number,
  lon: number,
  fetchFn: FetchFn = fetch,
): Promise<WeatherData> {
  const response = await fetchWithTimeoutRetry(openMeteoUrl(lat, lon), fetchFn);
  if (!response.ok) {
    throw new Error(`Open-Meteo responded with ${response.status}`);
  }
  const payload = openMeteoResponseSchema.parse(await response.json());

  return {
    current: {
      tempC: payload.current.temperature_2m,
      humidity: payload.current.relative_humidity_2m,
      windKmh: payload.current.wind_speed_10m,
      text: wmoText(payload.current.weather_code),
    },
    daily: payload.daily.time.slice(0, 5).map((date, i) => ({
      date,
      minC: payload.daily.temperature_2m_min[i],
      maxC: payload.daily.temperature_2m_max[i],
      rainMm: payload.daily.precipitation_sum[i],
      // Open-Meteo returns null when no probability is available; 0 keeps the
      // type simple and matches "no rain expected".
      rainChancePct: payload.daily.precipitation_probability_max[i] ?? 0,
    })),
    fetchedAt: new Date().toISOString(),
    source: "open-meteo",
  };
}