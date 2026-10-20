# Deploying PondScale (Vercel + Neon)

Do not deploy from this step — this file is the readiness checklist.

## 1. Environment variables (names only — set the values in Vercel, never commit them)

| Name | Required | Value to set |
|---|---|---|
| `DATABASE_URL` | yes | The Neon Postgres connection string (use the pooled one; it already carries `sslmode=require`) |
| `SESSION_SECRET` | yes | A **fresh random 32-byte value** (see the command in `.env.example`) — not the local one |
| `APP_TZ` | no | `Africa/Lagos` (this is the default) |
| `DEMO_MODE` | yes, for judging | `true` — see section 4 |
| `OWM_API_KEY` | no | Only if you have an OpenWeatherMap key; otherwise Open-Meteo is used (no key) |
| `MARKET_API_URL` | no | Only if you have a real market API; otherwise the simulated feed is used |

No other names exist. Anything hardcoded to localhost? Nothing: the only
`localhost` in the repo is the example value in `.env.example`, and
production cookies are already `secure` when `NODE_ENV=production`.

## 2. Build

- Install command: `npm install` (Vercel default). The `postinstall` script
  runs `prisma generate`, so the Prisma client is generated on every fresh
  install — no manual step.
- Build command: `npm run build` (Vercel detects Next.js and uses this).
- Output: Next.js default.
- The build never touches the database, so it cannot fail on a slow Neon.

## 3. Database migrations

Migrations run **against Neon** with:

```bash
npm run db:deploy        # = npx prisma migrate deploy
```

Run this locally once after adding the env vars (or as a release step).
It only applies committed migrations from `prisma/migrations/` — it never
generates new ones, which is what you want in production. Then seed the demo
account once: `npm run db:seed` (idempotent).

## 4. DEMO_MODE for the judges — and one warning

- Set `DEMO_MODE=true` on the hosted site. It shows the "Try demo account"
  button on the login screen (the judges can look around without
  registering) and the "Demo: show weather alert" preview switch on the
  dashboard. The server re-checks the flag itself, so the button cannot be
  forged when it is off.
- **Use a stronger demo password on the hosted site.** The seeded demo
  account is public in the README (`demo@pondscale.test` / `demo1234`) —
  fine for localhost, weak on the internet. Before hosting: change the demo
  user's password (or change `DEMO.password` in `prisma/seed.ts` and re-run
  `npm run db:seed`), and put the new password only in the private demo
  notes — not in the README, not in the video.
- The demo account's data is disposable: re-running `npm run db:seed`
  converges the demo farm back to one pond per status.

## 5. After the first deploy — smoke list

1. `/login` renders; "Try demo account" works.
2. Dashboard shows stat cards; weather card badge says **Live** (or
   "Saved data" if Open-Meteo was slow — never a crash).
3. `/market` shows fish cards + the seven other crops.
4. A full check run and save; history chart updates.
5. Log out; visit `/` — redirected to `/login` (middleware gate).
