import { z } from "zod";

// Response shapes for the weather providers, validated with Zod before use
// (docs/00-global.md §3: "verify both endpoint shapes against their docs;
// validate the response with Zod; reject anything unexpected").
//
// Verified on 2026-10-18:
// - Open-Meteo: live call against the farm's coordinates (Port Harcourt) —
//   see docs/api.md for the captured sample.
// - OpenWeatherMap: official docs, https://openweathermap.org/api/forecast5
// Unknown extra fields are stripped by Zod; missing or wrongly typed fields
// reject the whole response, which triggers the saved-data fallback.

/// GET https://api.open-meteo.com/v1/forecast (current + daily blocks).
export const openMeteoResponseSchema = z.object({
  current: z.object({
    time: z.string(),
    interval: z.number().optional(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    wind_speed_10m: z.number(),
    weather_code: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string()).min(5),
    weather_code: z.array(z.number()).min(5),
    temperature_2m_max: z.array(z.number()).min(5),
    temperature_2m_min: z.array(z.number()).min(5),
    precipitation_sum: z.array(z.number()).min(5),
    precipitation_probability_max: z.array(z.number().nullable()).min(5),
  }),
});
export type OpenMeteoResponse = z.infer<typeof openMeteoResponseSchema>;

/// GET https://api.openweathermap.org/data/2.5/forecast (3-hour steps).
export const owmForecastResponseSchema = z.object({
  cod: z.union([z.string(), z.number()]).optional(),
  message: z.number().optional(),
  cnt: z.number().optional(),
  list: z
    .array(
      z.object({
        dt: z.number(), // unix seconds, UTC
        dt_txt: z.string().optional(),
        main: z.object({ temp: z.number(), humidity: z.number() }),
        wind: z.object({ speed: z.number() }), // m/s in metric
        weather: z.array(z.object({ description: z.string() })).min(1),
        pop: z.number().nullable().optional(), // probability of precipitation, 0–1
        rain: z.object({ "3h": z.number() }).optional(), // mm in this 3-hour slot
        snow: z.object({ "3h": z.number() }).optional(),
      }),
    )
    .min(1),
  city: z.object({
    name: z.string().optional(),
    timezone: z.number(), // city's UTC offset in seconds
  }),
});
export type OwmForecastResponse = z.infer<typeof owmForecastResponseSchema>;

/// The normalized shape every provider must return (docs/00-global.md §3).
export const currentWeatherSchema = z.object({
  tempC: z.number(),
  humidity: z.number(),
  windKmh: z.number(),
  text: z.string(),
});

export const dailyForecastSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minC: z.number(),
  maxC: z.number(),
  rainMm: z.number(),
  rainChancePct: z.number(),
});

export const weatherProviderIdSchema = z.enum(["open-meteo", "openweathermap"]);

export const weatherDataSchema = z.object({
  current: currentWeatherSchema,
  daily: z.array(dailyForecastSchema).min(5),
  fetchedAt: z.string(),
  source: weatherProviderIdSchema,
});

export type CurrentWeather = z.infer<typeof currentWeatherSchema>;
export type DailyForecast = z.infer<typeof dailyForecastSchema>;
export type WeatherProviderId = z.infer<typeof weatherProviderIdSchema>;
export type WeatherData = z.infer<typeof weatherDataSchema>;