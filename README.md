# PondScale — is my fish feed right?

Fish-farm dashboard for the "Agro-Analytics" track. Per pond it answers one
question: **is the feeding right**, using feed conversion ratio (FCR) and
growth over a check window — plus the money side: feed cost per kg of fish
grown, and the market value of the fish still in the ponds.

Decision-support tool. You decide.

Status: **complete — all 8 steps.** Login, ponds, the 3-step check wizard,
result with money, history with FCR/growth charts, dashboard EMV charts,
market page (nine crops), live weather with alerts, demo mode, docs and
hosting readiness ([docs/DEPLOY.md](docs/DEPLOY.md)).

## Stack

Next.js 14 (App Router, TypeScript) · Tailwind · Prisma + Postgres (Neon) ·
Recharts · Zod · iron-session · bcryptjs · date-fns-tz · Vitest. Accent
`#0B63CE`. Money is integer kobo (₦1 = 100 kobo), formatted at the edge.
All dates use `APP_TZ` (default `Africa/Lagos`).

## Setup

```bash
npm install                 # postinstall runs `prisma generate`
cp .env.example .env        # then set DATABASE_URL and SESSION_SECRET
npm run db:migrate          # create the tables
npm run db:seed             # demo farmer, one pond per status, feed price
npm run dev                 # http://localhost:3000
```

Use another port with `npm run dev -- -p 3100` (any port works; nothing is
hardcoded). Tests: `npm test`. Checks: `npm run typecheck`, `npm run build`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 (`-- -p 3100` for another port) |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Vitest: FCR logic, chart series, market generator + fallback, weather fallback, alerts, auth, ownership |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:migrate` | Create tables (prisma migrate dev) |
| `npm run db:seed` | Idempotent demo data: one pond per check status |
| `npm run db:deploy` | Apply committed migrations (production / Neon) |
| `npm run db:reset` | Drop, migrate, re-seed (local only) |
| `npm run db:studio` | Prisma Studio |

## Environment variables (names only; values live in `.env`, never committed)

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Neon in deployment) |
| `SESSION_SECRET` | yes | iron-session secret; the app refuses to start without it |
| `APP_TZ` | no | Default `Africa/Lagos` |
| `DEMO_MODE` | no | `true` shows "Try demo account" and the dashboard's demo alert switch |
| `OWM_API_KEY` | no | OpenWeatherMap instead of the default Open-Meteo (no key) |
| `MARKET_API_URL` | no | A real market API instead of the simulated feed (auto-fallback) |

`.env.example` lists them all. `.env` is git-ignored. After build, the
client bundle is grepped for every key name — none are present.

## Demo account

- Email: `demo@pondscale.test`
- Password: `demo1234`

Credentials live here and in `prisma/seed.ts`, never in the app code. The
hosted site should use a **stronger** demo password — see
[docs/DEPLOY.md](docs/DEPLOY.md) §4.

## What is live and what is simulated

- **Weather: live.** Open-Meteo (no key), called server-side with a 5 s
  timeout and one retry, cached 30 minutes in `WeatherSnapshot`; failures
  show the last snapshot with a "Saved data" badge, or an error card with
  Retry.
- **Market prices: simulated** by default — a deterministic nine-crop feed
  (`GET /api/market/prices`, `/api/market/history`). Set `MARKET_API_URL`
  and the Live provider takes over, falling back to the simulated feed on
  any failure. Catfish mirrors tilapia in the simulated feed so the demo
  always shows one rising and one falling price.
- Every data card carries the Live / Saved data / Simulated badge.

## Data model

| Model | Purpose |
|---|---|
| `User` | Farmer login (bcrypt cost 10) |
| `Farm` | Name, coordinates, currency; default Port Harcourt 4.8156, 7.0498 |
| `Pond` | Name + species (`TILAPIA` / `CATFISH`), unique per farm |
| `FeedPrice` | Feed cost per kg for the farm, in kobo (one row per farm) |
| `Check` | One growth check: fish count, days, weights, feed used, status, FCR, ADG, feed cost per kg gained, stock value |
| `PriceTick` | Daily price per crop, unique per crop+date (the market feed cache) |
| `WeatherSnapshot` | Cached weather, so an API failure still shows saved data |

Full tables, fields and relations: [docs/schema.md](docs/schema.md).
`InventoryItem` from the shared Agro base is intentionally absent — the
ponds are the stock, and the stock value plays the Estimated Market Value
role.

## Seed contents

Feed price ₦1,200/kg · seven days of simulated fish prices · **one pond per
status**, so every result state is visible from day one:

| Pond | Species | Check inputs | Status | FCR | Stock value |
|---|---|---|---|---|---|
| Mango Creek | Tilapia | 1,000 fish · 30 d · 25 → 60 g · 55 kg feed | ✓ Good | 1.57 | ₦150,000 |
| Palm Grove | Tilapia | 500 fish · 30 d · 25 → 45 g · 15 kg feed | ! Slow growth | 1.50 | ₦56,250 |
| Creek Side | Catfish | 200 fish · 30 d · 50 → 110 g · 30 kg feed | ! Too much feed | 2.50 | ₦61,600 |
| Nursery Pond | Tilapia | 1,000 fish · 30 d · 100 → 160 g · 40 kg feed | × Check numbers | 0.67 | ₦400,000 |
| Back Pond | Tilapia | 800 fish · 14 d · 40 → 38 g · 35 kg feed | × No growth | — | ₦76,000 |

Feed prices, prices and the FCR limits (tilapia/catfish fcrMax 1.8, adgMin
1.0 / 2.0) are **placeholders** — a fish expert must review them before any
real use.

## Docs

- [docs/task-overview.md](docs/task-overview.md) — one page: APIs, live vs
  simulated, the formulas with a worked example
- [docs/api.md](docs/api.md) — every external call and route, with samples
- [docs/schema.md](docs/schema.md) — tables, fields, relations
- [docs/report-notes.md](docs/report-notes.md) — report material
- [docs/demo-script.md](docs/demo-script.md) — 5–7 minute video script
- [docs/rules-checklist.md](docs/rules-checklist.md) — judging rules proved
  in the code
- [docs/DEPLOY.md](docs/DEPLOY.md) — Vercel + Neon readiness
