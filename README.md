# PondScale — is my fish feed right?

Fish-farm dashboard for the "Agro-Analytics" track. Per pond it answers one
question: **is the feeding right**, using feed conversion ratio (FCR) and
growth over a check window — plus the money side: feed cost per kg of fish
grown, and the market value of the fish still in the pond.

Decision-support tool. You decide.

Status: **step 1 of 8 — schema + seed.** No FCR logic, weather or screens yet.

## Stack

Next.js 14 (App Router, TypeScript) · Tailwind · Prisma + Postgres · Recharts ·
Zod · iron-session · bcryptjs · date-fns-tz · Vitest. Accent `#0B63CE`.

Money is stored as integer kobo (₦1 = 100 kobo) and formatted at the edge.
All dates and times use `APP_TZ` (default `Africa/Lagos`).

## Setup

```bash
npm install
cp .env.example .env      # then set DATABASE_URL
npm run db:migrate        # create the tables
npm run db:seed           # one pond per check status, feed price, fish prices
npm run dev               # http://localhost:3000
```

`npm run typecheck` runs TypeScript. `npm run db:studio` opens Prisma Studio.

`npm run db:seed` is idempotent: re-running it converges on the same demo rows.

### Postgres

Any Postgres works locally; Neon free tier in deployment (`?sslmode=require`).
The plan is Postgres in dev as well as production, so no SQLite-only behaviour
sneaks in.

To reset everything: `npm run db:reset` drops, re-migrates and re-seeds.

## Demo account

- Email: `demo@pondscale.test`
- Password: `demo1234`

Demo credentials live here, never in the app code.

## Data model (step 1)

| Model | Purpose |
|---|---|
| `User` | Farmer login (bcrypt cost 10) |
| `Farm` | Name, coordinates, currency; default Port Harcourt 4.8156, 7.0498 |
| `Pond` | Name + species (`TILAPIA` / `CATFISH`), unique per farm |
| `FeedPrice` | Feed cost per kg for the farm, in kobo (one row per farm) |
| `Check` | One growth check: fish count, days, start/current weight, feed used, status, FCR, ADG, feed cost per kg gained, stock value |
| `PriceTick` | Daily price per crop, unique per crop+date (shared market feed; step 2 fills it) |
| `WeatherSnapshot` | Cached weather, so an API failure still shows saved data (step 3) |

`InventoryItem` from the shared Agro base is intentionally **not** here — the
ponds are the stock (docs/00-global.md §3).

Enums: `Crop` (nine catalog crops), `Unit`, `PriceSource` (`SIMULATED` /
`LIVE`), `Species`, `CheckStatus` (`NO_GROWTH`, `CHECK_NUMBERS`,
`TOO_MUCH_FEED`, `SLOW_GROWTH`, `GOOD` — the order `fcr.ts` decides them).

`Check.fcr` is nullable: a pond whose fish did not grow has no gain to divide
by, so no FCR is computed (docs/02-pondscale.md rule 1). Range rules
(fishCount ≥ 1, days ≥ 1, weights 1–5000 g, feedKg > 0) are enforced by Zod in
step 4 and asserted by the `fcr.ts` tests in step 3.

## Seed contents

Feed price ₦1,200/kg · seven days of simulated TILAPIA (≈ ₦2,500/kg) and
CATFISH (≈ ₦2,800/kg) prices · **one pond per status**, so every result state
is visible from day one:

| Pond | Species | Check inputs | Status | FCR | Stock value |
|---|---|---|---|---|---|
| Mango Creek | Tilapia | 1,000 fish · 30 d · 25 → 60 g · 55 kg feed | ✓ Good | 1.57 | ₦150,000 |
| Palm Grove | Tilapia | 500 fish · 30 d · 25 → 45 g · 15 kg feed | ! Slow growth | 1.50 | ₦56,250 |
| Creek Side | Catfish | 200 fish · 30 d · 50 → 110 g · 30 kg feed | ! Too much feed | 2.50 | ₦61,600 |
| Nursery Pond | Tilapia | 1,000 fish · 30 d · 100 → 160 g · 40 kg feed | × Check numbers | 0.67 | ₦400,000 |
| Back Pond | Tilapia | 800 fish · 14 d · 40 → 38 g · 35 kg feed | × No growth | — | ₦76,000 |

Feed prices, FCR limits (Tilapia/Catfish fcrMax 1.8, adgMin 1.0 / 2.0) and
prices are **placeholders**. An expert must review them before any real use.

## Next steps

2. Market + weather · 3. `fcr.ts` + tests (each of the 5 statuses, equal
weights, feedKg 0 rejected, FCR exactly 1.8 → not "too much", exactly 1.0 →
not "check numbers", days < 7 note) · 4. New-check wizard (3 steps) + Zod
server validation · 5. Result screen + money · 6. History chart ·
7. Dashboard estimated market value · 8. Full click-through.