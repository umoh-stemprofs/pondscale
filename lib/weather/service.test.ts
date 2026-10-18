import { describe, expect, it, vi } from "vitest";
import type { WeatherData } from "./schemas";
import {
  getWeather,
  isValidFarmCoords,
  type SnapshotStore,
  type WeatherSnapshotRecord,
} from "./service";

// The fallback contract (docs/00-global.md §3): fresh fetch → saved; fetch
// fails → last snapshot with live=false ("Saved data" badge); nothing saved
// → an error the page can show. The store and clock are injected so tests
// never touch the network or the database.

const NOW = new Date("2026-10-18T12:00:00.000Z");

const sampleData: WeatherData = {
  current: { tempC: 28.8, humidity: 75, windKmh: 10.1, text: "Dense drizzle" },
  daily: Array.from({ length: 5 }, (_, i) => ({
    date: `2026-10-${18 + i}`,
    minC: 24,
    maxC: 30,
    rainMm: i === 1 ? 22 : 0,
    rainChancePct: 40,
  })),
  fetchedAt: "2026-10-18T09:00:00.000Z",
  source: "open-meteo",
};

function fakeStore(rows: WeatherSnapshotRecord[]) {
  const saved: WeatherData[] = [];
  const store: SnapshotStore = {
    latest: async () => rows[0] ?? null,
    save: async (_farmId, data) => {
      saved.push(data);
    },
  };
  return { store, saved };
}

const snapshotAt = (fetchedAt: Date): WeatherSnapshotRecord => ({
  fetchedAt,
  source: sampleData.source,
  payload: sampleData,
});

describe("getWeather", () => {
  it("fetches fresh weather and saves a snapshot (Live)", async () => {
    const { store, saved } = fakeStore([]);
    const fetcher = vi.fn(async () => sampleData);
    const result = await getWeather({
      farmId: "farm1",
      lat: 4.8156,
      lon: 7.0498,
      store,
      fetcher,
      now: () => NOW,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.live).toBe(true);
      expect(result.source).toBe("open-meteo");
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(saved).toHaveLength(1);
  });

  it("serves a snapshot younger than 30 minutes without calling the provider", async () => {
    const tenMinutesAgo = new Date(NOW.getTime() - 10 * 60_000);
    const { store } = fakeStore([snapshotAt(tenMinutesAgo)]);
    const fetcher = vi.fn(async () => sampleData);
    const result = await getWeather({
      farmId: "farm1",
      lat: 4.8156,
      lon: 7.0498,
      store,
      fetcher,
      now: () => NOW,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.live).toBe(true);
      expect(result.fetchedAt).toBe(tenMinutesAgo.toISOString());
    }
  });

  it("falls back to the last saved snapshot when the live call fails (Saved data)", async () => {
    const threeHoursAgo = new Date(NOW.getTime() - 3 * 3_600_000);
    const { store, saved } = fakeStore([snapshotAt(threeHoursAgo)]);
    const fetcher = vi.fn(async () => {
      throw new Error("timeout after 5 s");
    });
    const result = await getWeather({
      farmId: "farm1",
      lat: 4.8156,
      lon: 7.0498,
      store,
      fetcher,
      now: () => NOW,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // live=false is what shows the "Saved data · 3 h old" badge.
      expect(result.live).toBe(false);
      expect(result.fetchedAt).toBe(threeHoursAgo.toISOString());
      expect(result.current.tempC).toBe(28.8);
    }
    expect(saved).toHaveLength(0);
  });

  it("returns an error the page can show when the fetch fails and nothing is saved", async () => {
    const { store } = fakeStore([]);
    const fetcher = vi.fn(async () => {
      throw new Error("network down");
    });
    const result = await getWeather({
      farmId: "farm1",
      lat: 4.8156,
      lon: 7.0498,
      store,
      fetcher,
      now: () => NOW,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("unavailable");
    }
  });

  it("still shows fresh weather when the snapshot store is down (farm lookup failed)", async () => {
    // docs/02-pondscale.md step 4A rule 4: a slow database must not hide the
    // weather — fetch live, skip saving, and never touch a farmId that is null.
    const saved: string[] = [];
    const store: SnapshotStore = {
      latest: async () => {
        throw new Error("database timeout");
      },
      save: async (farmId) => {
        saved.push(farmId);
      },
    };
    const fetcher = vi.fn(async () => sampleData);
    const result = await getWeather({
      farmId: null,
      lat: 4.8156,
      lon: 7.0498,
      store,
      fetcher,
      now: () => NOW,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.live).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(saved).toEqual([]);
  });

  it("ignores a fresh-looking snapshot with a corrupt payload and refetches", async () => {
    const corrupt: WeatherSnapshotRecord = {
      fetchedAt: new Date(NOW.getTime() - 5 * 60_000),
      source: "open-meteo",
      payload: { broken: true },
    };
    const { store } = fakeStore([corrupt]);
    const fetcher = vi.fn(async () => sampleData);
    const result = await getWeather({
      farmId: "farm1",
      lat: 4.8156,
      lon: 7.0498,
      store,
      fetcher,
      now: () => NOW,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.live).toBe(true);
  });

  it("rejects out-of-range farm coordinates with one clear sentence", async () => {
    const { store } = fakeStore([]);
    const fetcher = vi.fn(async () => sampleData);
    const result = await getWeather({
      farmId: "farm1",
      lat: 120,
      lon: 7.0498,
      store,
      fetcher,
      now: () => NOW,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("out of range");
  });
});

describe("isValidFarmCoords", () => {
  it("accepts Port Harcourt and rejects nonsense", () => {
    expect(isValidFarmCoords(4.8156, 7.0498)).toBe(true);
    expect(isValidFarmCoords(-90, 180)).toBe(true);
    expect(isValidFarmCoords(91, 0)).toBe(false);
    expect(isValidFarmCoords(0, -181)).toBe(false);
    expect(isValidFarmCoords(Number.NaN, 0)).toBe(false);
  });
});