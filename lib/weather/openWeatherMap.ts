import { fetchWithTimeoutRetry, type FetchFn } from "./http";
import { owmForecastResponseSchema, type WeatherData } from "./schemas";

// OpenWeatherMap 5-day / 3-hour forecast (used only when OWM_API_KEY is set):
// GET https://api.openweathermap.org/data/2.5/forecast?lat&lon&appid&units=metric
// Field paths verified against the official docs on 2026-10-18:
// https://openweathermap.org/api/forecast5
//   list[i].main.temp (°C), list[i].main.humidity (%), list[i].wind.speed
//   (m/s in metric), list[i].weather[0].description, list[i].dt (UTC seconds),
//   city.timezone (city UTC offset in seconds), optional list[i].rain["3h"] mm.

export function openWeatherMapUrl(lat: number, lon: number, apiKey: string): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    appid: apiKey,
    units: "metric",
  });
  return `https://api.openweathermap.org/data/2.5/forecast?${params.toString()}`;
}

export async function fetchOpenWeatherMap(
  lat: number,
  lon: number,
  apiKey: string,
  fetchFn: FetchFn = fetch,
): Promise<WeatherData> {
  const response = await fetchWithTimeoutRetry(openWeatherMapUrl(lat, lon, apiKey), fetchFn);
  if (!response.ok) {
    throw new Error(`OpenWeatherMap responded with ${response.status}`);
  }
  const payload = owmForecastResponseSchema.parse(await response.json());

  // Fold the 3-hour entries into one entry per calendar day, in the city's
  // local time (dt is UTC; city.timezone is the offset in seconds).
  const byDay = new Map<string, { temps: number[]; rainMm: number; pops: number[] }>();
  for (const entry of payload.list) {
    const date = new Date((entry.dt + payload.city.timezone) * 1000)
      .toISOString()
      .slice(0, 10);
    const day = byDay.get(date) ?? { temps: [], rainMm: 0, pops: [] };
    day.temps.push(entry.main.temp);
    day.rainMm += (entry.rain?.["3h"] ?? 0) + (entry.snow?.["3h"] ?? 0);
    if (entry.pop != null) day.pops.push(entry.pop);
    byDay.set(date, day);
  }

  const daily = [...byDay.entries()].slice(0, 5).map(([date, day]) => ({
    date,
    minC: Math.min(...day.temps),
    maxC: Math.max(...day.temps),
    rainMm: Math.round(day.rainMm * 10) / 10,
    rainChancePct: day.pops.length > 0 ? Math.round(Math.max(...day.pops) * 100) : 0,
  }));

  const first = payload.list[0];
  return {
    current: {
      tempC: first.main.temp,
      humidity: first.main.humidity,
      // Wind speed in metric is m/s; km/h is m/s × 3.6.
      windKmh: Math.round(first.wind.speed * 3.6 * 10) / 10,
      text: first.weather[0].description,
    },
    daily,
    fetchedAt: new Date().toISOString(),
    source: "openweathermap",
  };
}