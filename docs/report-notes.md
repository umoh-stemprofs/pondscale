# Report notes — bullet material for the 4–8 page report

## Architecture (1 page)

- Next.js 14 App Router, TypeScript, server components by default — every
  page fetches its data on the server, so no database URL or API key ever
  reaches the browser.
- Postgres on Neon via Prisma; migrations (`prisma migrate deploy`), seed
  with one pond per check status so every state is demoable.
- Logic is pure functions in `lib/` (`fcr.ts`, `charts/series.ts`,
  `market/generator.ts`, `weather/*`) with Vitest unit tests written before
  the screens; the same functions back the pages, the server actions and the
  tests.
- Adapter pattern for both external services: `MarketProvider`
  (SimulatedProvider default, LiveProvider with automatic fallback) and the
  weather fetchers (Open-Meteo default, OpenWeatherMap with a key). The
  data-source badge always reflects the true source.
- Resilience: 30-minute weather cache in `WeatherSnapshot`; on provider
  failure the last snapshot is served with a "Saved data" badge; with none,
  an error card with Retry. Database failures show one sentence per page, and
  a Next.js error boundary catches anything unexpected.
- Speed: independent database and provider calls run in parallel
  (Promise.all) on every page; two `getPrices` calls (today + yesterday)
  serve price cards for all nine crops.

## Security (1 page)

- Passwords bcrypt cost 10; Zod validation on every server input; the server
  recomputes every stored number, so a forged FCR/stock value is ignored.
- iron-session cookie: httpOnly, sameSite=lax, secure in production,
  14-day TTL; secret only in `SESSION_SECRET` (fails loudly if missing, but
  never logs the value).
- Ownership is part of the WHERE clause (`pondForFarm`, `checkForFarm`,
  `listChecksForFarm`) — a farmer can only ever read or write their own
  farm's rows, proved by tests with an in-memory store that filters on id
  AND farmId.
- Middleware gates every page; each server action re-checks the session
  itself (never only the UI). `?next=` redirects are sanitized to in-app
  paths only.
- `.env` git-ignored; `.env.example` committed with empty/example values;
  after build the client bundle is grepped for every key name — zero
  matches.

## Responsive design (0.5 page)

- Three layouts from one shell: 240 px sidebar at ≥1024 px (design.md §3),
  top bar 640–1023 px, phone bottom nav with four items below 640 px.
- Verified at 1440, 768 and 390 px on all four pages: no horizontal
  overflow; charts, tables, badges and the 5-day forecast strip all fit.
- 48 px minimum touch targets, visible focus rings, status is always color
  + icon + word (never color alone), chart tables are the accessible twin of
  every chart.

## How it helps a fish farmer earn more (1 page)

- Feed is 60–70 % of fish-farm costs. FCR turns "I fed them" into a number:
  FCR 2.5 means 2.5 kg of feed bought 1 kg of fish — at ₦1,200/kg feed that
  is ₦3,000 of feed for ₦2,500 of fish (a loss), which the result screen
  states in naira.
- The "too much feed" status says "Reduce feed by 10 %" — on the demo's
  Creek Side pond that is 3 kg of feed saved per 30-day window per pond.
- The "slow growth" status catches the opposite problem (underfeeding),
  which FCR alone cannot see — it uses average daily growth against the
  species minimum.
- Stock value (EMV) shows what is sitting in the ponds at today's prices,
  so a farmer can decide between selling now and feeding on.
- The weather alert ("fish eat less on hot or stormy days — feed 10 % less
  today") prevents feed wasted on fish that will not eat.
- Five-second answer per pond: status pill + one action sentence + money.

## Limits and what is simulated (0.5 page — required honesty)

- **Species limits are samples.** fcrMax 1.8 for both species, adgMin 1.0
  (tilapia) / 2.0 (catfish) come from the project plan — a fish expert must
  confirm them before any real use.
- **Prices are simulated.** The market feed is a deterministic generator
  (documented formula, START_DATE 2026-01-01). Catfish mirrors tilapia by
  design so the demo always shows one rising and one falling price. Point
  `MARKET_API_URL` at a real market API for live prices.
- **The weather is real** (Open-Meteo), but the alert thresholds (34 °C,
  20 mm rain) are sample values.
- **One farm per farmer in practice** (the schema allows many; the UI uses
  the first), **two species only**, no feed inventory, no labour cost, no
  survival/mortality tracking — a fish expert's review would set real
  thresholds and add mortality.
- Decision-support tool. The app advises; the farmer decides.
