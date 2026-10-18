import type { Prisma } from "@prisma/client";
import { WEATHER_CACHE_MINUTES } from "../config";
import { db } from "../db";
import { fetchOpenMeteo } from "./openMeteo";
import { fetchOpenWeatherMap } from "./openWeatherMap";
import { weatherDataSchema, type WeatherData } from "./schemas";

// Weather service (docs/00-global.md §3): server-only, 30-minute cache in
// WeatherSnapshot. Fresh-enough snapshots are served directly; when the live
// call fails, the last snapshot is served with live=false so the badge shows
// "Saved data · X h old". With no snapshot at all, an error the page can show.

export interface WeatherSnapshotRecord {
  fetchedAt: Date;
  source: string;
  payload: unknown;
}

export interface SnapshotStore {
  latest(farmId: string): Promise<WeatherSnapshotRecord | null>;
  save(farmId: string, data: WeatherData): Promise<void>;
}

/// The real store: WeatherSnapshot rows in Postgres.
export const prismaSnapshotStore: SnapshotStore = {
  latest: (farmId) =>
    db.weatherSnapshot.findFirst({
      where: { farmId },
      orderBy: { fetchedAt: "desc" },
    }),
  save: async (farmId, data) => {
    await db.weatherSnapshot.create({
      data: {
        farmId,
        source: data.source,
        fetchedAt: new Date(data.fetchedAt),
        payload: data as unknown as Prisma.InputJsonValue,
      },
    });
  },
};

export type WeatherFetcher = (lat: number, lon: number) => Promise<WeatherData>;

/// OpenWeatherMap when OWM_API_KEY is set, Open-Meteo (no key) otherwise.
export function defaultWeatherFetcher(): WeatherFetcher {
  const apiKey = process.env.OWM_API_KEY?.trim();
  return apiKey
    ? (lat, lon) => fetchOpenWeatherMap(lat, lon, apiKey)
    : (lat, lon) => fetchOpenMeteo(lat, lon);
}

/// Latitude −90..90, longitude −180..180 (docs/00-global.md §3).
export function isValidFarmCoords(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export type WeatherResult =
  | ({ ok: true; live: boolean } & WeatherData)
  | { ok: false; error: string };

export interface GetWeatherOptions {
  farmId: string;
  lat: number;
  lon: number;
  store?: SnapshotStore;
  fetcher?: WeatherFetcher;
  now?: () => Date;
}

export async function getWeather(options: GetWeatherOptions): Promise<WeatherResult> {
  const { farmId, lat, lon } = options;
  const store = options.store ?? prismaSnapshotStore;
  const fetcher = options.fetcher ?? defaultWeatherFetcher();
  const now = options.now ?? (() => new Date());

  if (!isValidFarmCoords(lat, lon)) {
    return {
      ok: false,
      error: "Farm location is out of range. Latitude must be −90 to 90, longitude −180 to 180.",
    };
  }

  const cached = await store.latest(farmId);
  const ageMinutes = cached ? (now().getTime() - cached.fetchedAt.getTime()) / 60_000 : Infinity;

  // Serve a fresh snapshot instead of hammering the provider (30-min cache).
  if (cached && ageMinutes < WEATHER_CACHE_MINUTES) {
    const parsed = weatherDataSchema.safeParse(cached.payload);
    if (parsed.success) {
      return { ok: true, live: true, ...parsed.data, fetchedAt: cached.fetchedAt.toISOString() };
    }
  }

  try {
    const fresh = await fetcher(lat, lon);
    await store.save(farmId, fresh);
    return { ok: true, live: true, ...fresh };
  } catch {
    // Live call failed (timeout, network, unexpected shape). Fall back to the
    // last saved snapshot — the badge will show "Saved data · X h old".
    if (cached) {
      const parsed = weatherDataSchema.safeParse(cached.payload);
      if (parsed.success) {
        return { ok: true, live: false, ...parsed.data, fetchedAt: cached.fetchedAt.toISOString() };
      }
    }
    return { ok: false, error: "Weather is unavailable right now. Try again in a few minutes." };
  }
}