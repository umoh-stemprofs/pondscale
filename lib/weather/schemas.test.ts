import { describe, expect, it } from "vitest";
import {
  openMeteoResponseSchema,
  owmForecastResponseSchema,
  weatherDataSchema,
} from "./schemas";

// Fixtures mirror the verified shapes: Open-Meteo from a live call on
// 2026-10-18 (Port Harcourt), OpenWeatherMap from the official docs.

const openMeteoFixture = {
  latitude: 4.8,
  longitude: 7.05,
  generationtime_ms: 0.1,
  utc_offset_seconds: 3600,
  timezone: "Africa/Lagos",
  timezone_abbreviation: "WAT",
  elevation: 12.0,
  current_units: { time: "iso8601" },
  current: {
    time: "2026-10-18T13:15",
    interval: 900,
    temperature_2m: 28.8,
    relative_humidity_2m: 75,
    wind_speed_10m: 10.1,
    weather_code: 55,
  },
  daily_units: { time: "iso8601" },
  daily: {
    time: ["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"],
    weather_code: [55, 63, 2, 3, 80],
    temperature_2m_max: [31.3, 30.1, 32.0, 33.4, 30.8],
    temperature_2m_min: [24.5, 24.1, 24.9, 25.0, 24.7],
    precipitation_sum: [4.9, 22.0, 0.0, 0.0, 3.2],
    precipitation_probability_max: [100, 90, 5, 10, 60],
  },
};

const owmFixture = {
  cod: "200",
  message: 0,
  cnt: 40,
  list: [
    {
      dt: 1799746800,
      main: { temp: 28.9, feels_like: 31.2, temp_min: 28.9, temp_max: 28.9, pressure: 1011, humidity: 78 },
      weather: [{ id: 500, main: "Rain", description: "light rain", icon: "10d" }],
      clouds: { all: 90 },
      wind: { speed: 3.6, deg: 210 },
      visibility: 10000,
      pop: 0.66,
      rain: { "3h": 1.2 },
      sys: { pod: "d" },
      dt_txt: "2026-10-18 12:00:00",
    },
    {
      dt: 1799757600,
      main: { temp: 27.2, feels_like: 29.4, temp_min: 27.2, temp_max: 27.2, pressure: 1012, humidity: 82 },
      weather: [{ id: 501, main: "Rain", description: "moderate rain", icon: "10n" }],
      clouds: { all: 95 },
      wind: { speed: 4.1, deg: 220 },
      visibility: 8000,
      pop: 0.8,
      rain: { "3h": 3.6 },
      sys: { pod: "n" },
      dt_txt: "2026-10-18 15:00:00",
    },
  ],
  city: { id: 2332325, name: "Port Harcourt", coord: { lat: 4.81, lon: 7.04 }, country: "NG", population: 3_000_000, timezone: 3600, sunrise: 1799712000, sunset: 1799755200 },
};

describe("Open-Meteo response schema", () => {
  it("accepts the live-verified shape and strips unknown metadata", () => {
    const parsed = openMeteoResponseSchema.parse(openMeteoFixture);
    expect(parsed.current.temperature_2m).toBe(28.8);
    expect(parsed.daily.time).toHaveLength(5);
    expect("latitude" in parsed).toBe(false); // stripped, not rejected
  });

  it("rejects a response missing a required field", () => {
    const broken = structuredClone(openMeteoFixture) as Record<string, unknown>;
    delete (broken.daily as Record<string, unknown>).precipitation_sum;
    expect(openMeteoResponseSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a response with fewer than 5 forecast days", () => {
    const short = structuredClone(openMeteoFixture);
    short.daily.time = ["2026-10-18", "2026-10-19"];
    expect(openMeteoResponseSchema.safeParse(short).success).toBe(false);
  });
});

describe("OpenWeatherMap response schema", () => {
  it("accepts the docs-verified shape", () => {
    const parsed = owmForecastResponseSchema.parse(owmFixture);
    expect(parsed.list[0].main.temp).toBe(28.9);
    expect(parsed.city.timezone).toBe(3600);
  });

  it("rejects entries with an empty weather array", () => {
    const broken = structuredClone(owmFixture);
    broken.list[0].weather = [];
    expect(owmForecastResponseSchema.safeParse(broken).success).toBe(false);
  });

  it("accepts entries without rain (it does not always rain)", () => {
    const dry = structuredClone(owmFixture);
    delete (dry.list[0] as { rain?: { "3h": number } }).rain;
    expect(owmForecastResponseSchema.safeParse(dry).success).toBe(true);
  });
});

describe("normalized weather data", () => {
  it("round-trips through the schema the snapshots are stored with", () => {
    const data = {
      current: { tempC: 28.8, humidity: 75, windKmh: 10.1, text: "Dense drizzle" },
      daily: Array.from({ length: 5 }, (_, i) => ({
        date: `2026-10-${18 + i}`,
        minC: 24,
        maxC: 30,
        rainMm: i,
        rainChancePct: 40,
      })),
      fetchedAt: "2026-10-18T13:15:00.000Z",
      source: "open-meteo",
    };
    expect(weatherDataSchema.parse(data)).toEqual(data);
  });
});