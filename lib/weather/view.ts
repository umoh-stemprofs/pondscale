import { DEFAULT_FARM_LOCATION } from "../config";
import { getWeather, isValidFarmCoords, type WeatherResult } from "./service";

// Page-level weather loading (docs/02-pondscale.md step 4A rule 4): if the
// farm lookup fails because the database is slow, the weather card must
// still show weather — using the default coordinates and skipping the
// snapshot cache (farmId null → getWeather saves nothing).

export interface FarmWeather {
  result: WeatherResult;
  coordsLabel: string;
  providerName?: string;
}

export function providerNameOf(result: WeatherResult): string | undefined {
  if (!result.ok) return undefined;
  return result.source === "openweathermap" ? "OpenWeatherMap" : "Open-Meteo";
}

/**
 * Load weather for a farm; when `farm` is null (lookup failed) or its
 * coordinates are unusable, fall back to the default location.
 */
export async function loadFarmWeather(
  farm: { id: string; lat: number; lon: number } | null,
): Promise<FarmWeather> {
  const usable = farm !== null && isValidFarmCoords(farm.lat, farm.lon);
  const lat = usable ? farm.lat : DEFAULT_FARM_LOCATION.lat;
  const lon = usable ? farm.lon : DEFAULT_FARM_LOCATION.lon;
  const farmId = usable ? farm.id : null;

  let result: WeatherResult;
  try {
    result = await getWeather({ farmId, lat, lon });
  } catch {
    result = { ok: false, error: "Weather is unavailable right now. Try again in a few minutes." };
  }

  return {
    result,
    coordsLabel: usable
      ? `${lat}, ${lon}`
      : `${lat}, ${lon} · ${DEFAULT_FARM_LOCATION.name} (default location)`,
    providerName: providerNameOf(result),
  };
}
