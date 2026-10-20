# PondScale API documentation

Matches the code as of the final step. Two parts: the **external calls**
PondScale makes, and the **routes** PondScale serves.

## 1. External calls (server-side only, never from the browser)

### Open-Meteo — default weather provider (no key)

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=4.8156&longitude=7.0498
    &current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code
    &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max
    &timezone=Africa%2FLagos&forecast_days=5
```

- Built in `lib/weather/openMeteo.ts` from the farm's own coordinates;
  `timezone` is `APP_TZ` (default Africa/Lagos).
- 5-second timeout, one retry (`lib/weather/http.ts`), then fallback to the
  last saved snapshot ("Saved data" badge), then an error card with Retry.
- Response validated with Zod (`lib/weather/schemas.ts`); anything unexpected
  is rejected, never rendered.
- Sample (trimmed): `{"current":{"temperature_2m":28.8,"relative_humidity_2m":75,"wind_speed_10m":10.1,"weather_code":3},"daily":{"time":["2026-10-19"],"temperature_2m_max":[31.2],"temperature_2m_min":[24.6],"precipitation_sum":[5.2],"precipitation_probability_max":[98]}}`
- `weather_code` is a WMO code, mapped to plain text in `WMO_TEXT`
  (3 → "Overcast", 80 → "Slight rain showers", …).

### OpenWeatherMap — optional alternative

- Used only when `OWM_API_KEY` is set (`lib/weather/service.ts` →
  `lib/weather/openWeatherMap.ts`): 5-day / 3-hour forecast,
  `units=metric`, folded into the same 5-day shape. Response Zod-validated.

### Market feed — self-hosted "simulated live feed"

- Default provider is the deterministic generator
  (`lib/market/generator.ts`, `SimulatedProvider`): same crop + date always
  gives the same price; nine-crop catalog in `lib/market/catalog.ts`.
- When `MARKET_API_URL` is set, `LiveProvider` fetches that base URL with the
  paths below and **falls back to the simulated feed on any failure**
  (network error, non-2xx, unexpected shape). The quote's `source` field
  (`SIMULATED` / `LIVE`) is what the badge shows — the UI never lies.
- **Catfish mirrors tilapia in the simulated feed** (mirrorOf), so the fish
  cards always show one arrow up and one down. Sample data.

## 2. Routes PondScale serves

### `GET /api/market/prices`

Latest price of every crop in the catalog. Response:
`[{crop, date, priceKobo, unit, source}]` — `crop` from the `Crop` enum,
`date` "YYYY-MM-DD", `priceKobo` integer kobo (₦1 = 100 kobo), `unit`
`KG|TRAY|LITRE`, `source` `SIMULATED|LIVE`. Quotes are cached into the
`PriceTick` table (unique crop+date).

```json
[
  { "crop": "TILAPIA", "date": "2026-10-19", "priceKobo": 258498, "unit": "KG", "source": "SIMULATED" },
  { "crop": "EGGS_TRAY", "date": "2026-10-19", "priceKobo": 381200, "unit": "TRAY", "source": "SIMULATED" }
]
```

### `GET /api/market/history?crop=MAIZE&days=30`

Daily prices for one crop, ascending by date. `days` 1–90 (default 30),
`crop` must be in the catalog — otherwise one sentence and HTTP 400:
`{"error":"Pick a crop from the catalog and days between 1 and 90."}`.
Same quote shape as `/prices`.

### `GET /api/session/expired`

Clears a session whose account no longer exists and redirects to
`/login?expired=1`. No body.

### Server actions (not REST — called by forms in the app)

`signup`, `login`, `demoLogin` (only when `DEMO_MODE=true`), `logout`
(`lib/actions/auth.ts`) · `saveCheck`, `deleteCheck`
(`lib/actions/checks.ts`) · pond create/rename/delete and settings save
(`lib/actions/ponds.ts`, `lib/actions/settings.ts`). Each re-checks the
session itself and is Zod-validated; the check service recomputes every
stored number from the five typed inputs, so a forged FCR never reaches the
database.

## 3. Error behaviour (every external dependency)

| Failure | What the user sees |
|---|---|
| Weather fetch fails, snapshot exists | Weather card with "Saved data · N h old" badge |
| Weather fetch fails, no snapshot | Weather card error state: "Weather unavailable" + Retry button |
| Farm lookup fails (slow database) | Weather still loads from the default Port Harcourt coordinates, labeled as default |
| Market feed fails | Market page: one sentence ("Price history is unavailable right now…"); check result: "Fish prices are unavailable right now, so the result cannot be calculated." Never an invented price |
| Database slow/unreachable | Each page shows "Cannot reach the database right now…" with a retry path; the app error boundary catches anything unexpected with a friendly page |

## 4. Key names (environment variables)

`DATABASE_URL`, `SESSION_SECRET`, `APP_TZ`, `DEMO_MODE`, `OWM_API_KEY`,
`MARKET_API_URL` — all read server-side only. After build, the client bundle
is grepped for these names: zero matches.
