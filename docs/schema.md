# PondScale database schema

Postgres (Neon) via Prisma — `prisma/schema.prisma`. Money is always
**integer kobo** (₦1 = 100 kobo). Calendar days use `@db.Date`; timestamps
use `timestamptz`. Deleting a farm cascades to its ponds, feed price,
weather snapshots; deleting a pond cascades to its checks.

## Tables

### `users` — one farmer login
`id` (cuid PK) · `email` (unique) · `name` · `passHash` (bcrypt cost 10) ·
`createdAt`. Relation: one user → many farms.

### `farms` — the farm whose coordinates drive the weather
`id` (PK) · `userId` (FK → users, cascade) · `name` · `lat` / `lon` (Float)
· `currency` (default "NGN") · `createdAt`. Relations: belongs to one user;
has many ponds, one feed price, many weather snapshots.

### `price_ticks` — one market price for one crop on one day (the market feed)
`id` (PK) · `crop` (enum `Crop`: MAIZE, CASSAVA, YAM, RICE_PADDY, TOMATO,
TILAPIA, CATFISH, EGGS_TRAY, PALM_OIL) · `date` (@db.Date) · `priceKobo`
(Int) · `unit` (enum `Unit`: KG, TRAY, LITRE) · `source` (enum
`PriceSource`: SIMULATED, LIVE) · `createdAt`.
**unique(crop, date)** — re-running the generator or seed for the same day
updates in place, never duplicates.

### `weather_snapshots` — cached weather, so an API failure still shows data
`id` (PK) · `farmId` (FK → farms, cascade) · `fetchedAt` · `source`
("open-meteo" / "openweathermap") · `payload` (Json, the full normalized
forecast). Index `(farmId, fetchedAt)`; the service reads the newest row.

### `ponds` — one fish species per pond
`id` (PK) · `farmId` (FK → farms, cascade) · `name` · `species` (enum
`Species`: TILAPIA, CATFISH) · `createdAt`. **unique(farmId, name)** — a
farmer cannot add the same pond name twice. Fish counts and weights are NOT
stored here: they are measured at each check.

### `feed_prices` — what a kg of feed costs on this farm
`id` (PK) · `farmId` (FK → farms, cascade, **unique**) · `priceKobo` (Int)
· `updatedAt`. One row per farm; saving settings upserts it.

### `checks` — one growth check for one pond (the app's core record)
`id` (PK) · `pondId` (FK → ponds, cascade) · `date` (@db.Date) ·
`fishCount` (Int, ≥1) · `days` (Int, ≥1) · `startG` / `currentG` (Int grams,
1–5000) · `feedKg` (Float, >0) · `status` (enum `CheckStatus`: NO_GROWTH,
CHECK_NUMBERS, TOO_MUCH_FEED, SLOW_GROWTH, GOOD) · `fcr` (Float?, NULL for
NO_GROWTH — no gain to divide by) · `adgGPerDay` (Float, may be negative) ·
`feedCostPerKgGainKobo` (Int?, FCR × feed price) · `stockValueKobo` (Int,
fish × weight now × price at save time) · `fishPriceKobo` (Int?, the price
used, so an old check's margin stays honest) · `createdAt`.
Index `(pondId, date)` — the history chart reads one pond's checks in order.

## Enums

| Enum | Values | Meaning |
|---|---|---|
| `Crop` | MAIZE · CASSAVA · YAM · RICE_PADDY · TOMATO · TILAPIA · CATFISH · EGGS_TRAY · PALM_OIL | The market feed's nine crops |
| `Unit` | KG · TRAY · LITRE | Price unit (eggs per tray of 30, palm oil per litre) |
| `PriceSource` | SIMULATED · LIVE | Shown in the data-source badge |
| `Species` | TILAPIA · CATFISH | What a pond holds; sets its FCR limits |
| `CheckStatus` | NO_GROWTH · CHECK_NUMBERS · TOO_MUCH_FEED · SLOW_GROWTH · GOOD | The five outcomes, in the order `fcr.ts` decides them |

## Notes

- `InventoryItem` from the shared Agro base is deliberately **absent**: the
  ponds *are* the stock, and the dashboard's stock value plays the
  "Estimated Market Value" role (docs/00-global.md §3).
- `Check.fcr` is nullable by design (no growth → no FCR), and every stored
  number is recomputed server-side from the five typed inputs at save time —
  the browser can never post a forged FCR or stock value.
