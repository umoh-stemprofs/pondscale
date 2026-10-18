# PondScale — external calls and APIs (docs/api.md)

Every external service PondScale talks to, with URL patterns, key names and
sample responses. This is report material for the Agro-Analytics track
(docs/00-global.md §3: "Write /docs/api.md listing every external call, URL
pattern, key name and sample response").

All keys live in `.env` (git-ignored). Nothing below puts a key in the
browser: weather and market calls happen on the server only.

| Key | Required | Used for |
|---|---|---|
| `DATABASE_URL` | yes | Postgres (Neon) via Prisma |
| `APP_TZ` | no (default `Africa/Lagos`) | all calendar dates |
| `OWM_API_KEY` | no | switches weather to OpenWeatherMap |
| `MARKET_API_URL` | no | switches market feed to a live API |
| `SESSION_SECRET` | later step | login session |

## 1. Market feed — built by us ("simulated live feed")

PondScale serves its own deterministic price feed. The same crop and date
always produce the same price (seeded PRNG, start date 2026-01-01), so the
demo is reproducible. `source` is `SIMULATED` unless a live provider answers.

### GET /api/market/prices

Latest price of every crop in the catalog (9 crops). Returns an array:

```json
[
  { "crop": "MAIZE",   "date": "2026-10-18", "priceKobo": 65084,  "unit": "KG",    "source": "SIMULATED" },
  { "crop": "TILAPIA", "date": "2026-10-18", "priceKobo": 260221, "unit": "KG",    "source": "SIMULATED" },
  { "crop": "EGGS_TRAY","date": "2026-10-18","priceKobo": 385600, "unit": "TRAY",  "source": "SIMULATED" }
]
```

Money is integer kobo (₦1 = 100 kobo). Each quote is upserted into
`PriceTick` (unique per crop+date) as a best-effort cache; the numbers are
computed, so a cache write never fails the API.

### GET /api/market/history?crop=TILAPIA&days=30

Daily prices for one crop, ascending, ending today. `days` is 1–90
(default 30); both parameters are validated with Zod.

```json
[
  { "crop": "TILAPIA", "date": "2026-10-12", "priceKobo": 259180, "unit": "KG", "source": "SIMULATED" },
  { "crop": "TILAPIA", "date": "2026-10-13", "priceKobo": 258433, "unit": "KG", "source": "SIMULATED" }
]
```

Bad input returns `400` with one sentence saying what to fix:

```json
{ "error": "Pick a crop from the catalog and days between 1 and 90." }
```

### Optional live market API — `MARKET_API_URL`

If `MARKET_API_URL` is set, PondScale calls
`${MARKET_API_URL}/prices` and `${MARKET_API_URL}/history?crop&days` and
expects the same quote-array shape shown above. Every failure (network,
non-2xx, unexpected shape) falls back to the simulated feed, and the quote's
`source` stays truthful so the badge never lies.

## 2. Weather — Open-Meteo (default, no API key)

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=4.8156&longitude=7.0498
    &current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code
    &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max
    &timezone=Africa%2FLagos&forecast_days=5
```

Shape verified with a live call on 2026-10-18 against the farm's own
coordinates. Trimmed sample:

```json
{
  "current": { "time": "2026-10-18T13:15", "temperature_2m": 28.8,
               "relative_humidity_2m": 75, "wind_speed_10m": 10.1, "weather_code": 55 },
  "daily": {
    "time": ["2026-10-18", "2026-10-19", "..."],
    "temperature_2m_max": [31.3, 30.1, "..."],
    "temperature_2m_min": [24.5, 24.1, "..."],
    "precipitation_sum": [4.9, 22.0, "..."],
    "precipitation_probability_max": [100, 90, "..."]
  }
}
```

WMO weather codes are mapped to plain text ("Dense drizzle", "Rain", …).
The response is validated with Zod; anything unexpected is rejected and the
saved-data fallback kicks in.

## 3. Weather — OpenWeatherMap (only when `OWM_API_KEY` is set)

```
GET https://api.openweathermap.org/data/2.5/forecast
    ?lat=4.8156&lon=7.0498&appid={OWM_API_KEY}&units=metric
```

Fields (verified against the official docs,
https://openweathermap.org/api/forecast5): `list[i].main.temp` (°C),
`list[i].main.humidity` (%), `list[i].wind.speed` (m/s → shown as km/h),
`list[i].weather[0].description`, `list[i].dt` (UTC seconds), optional
`list[i].rain["3h"]` (mm) and `list[i].pop` (0–1), `city.timezone` (UTC
offset in seconds). The 3-hour entries are folded into 5 local calendar days
using `city.timezone`. Trimmed sample:

```json
{
  "cod": "200", "cnt": 40,
  "list": [ { "dt": 1799746800, "main": { "temp": 28.9, "humidity": 78 },
              "wind": { "speed": 3.6 }, "pop": 0.66,
              "weather": [ { "description": "light rain" } ], "rain": { "3h": 1.2 } } ],
  "city": { "name": "Port Harcourt", "timezone": 3600 }
}
```

## 4. Caching and failure behaviour (both providers)

- Server-only calls, 5-second timeout, one retry.
- Successful fetches are stored in `WeatherSnapshot` and reused for 30
  minutes (badge: "Live · updated X ago").
- If the live call fails, the last snapshot is served with the
  "Saved data · X h old" badge.
- If there is no snapshot either, the page shows an error card with a Retry
  button; the rest of the app keeps working.

## 5. Pond weather alert (docs/02-pondscale.md)

From the farm forecast: any day at or above 34 °C, or at least 20 mm of rain
tomorrow → "Fish eat less on hot or stormy days. Feed 10% less today."
Thresholds live in `/lib/config.ts` (sample values — expert review needed).
Shown beside the FCR status; it never changes the status itself.