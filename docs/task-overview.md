# PondScale — task overview (one page)

**Question the app answers:** "Is my fish feed right?" Per pond, PondScale
compares the feed you used against the weight your fish gained (FCR and
growth), then shows the money side: feed cost per kg of fish grown and the
market value of the fish still in the pond.

## APIs used

| API | Purpose | Key | Live or Simulated |
|---|---|---|---|
| Open-Meteo `https://api.open-meteo.com/v1/forecast` | 5-day forecast for the farm's own coordinates | none needed | **Live** (default provider) |
| OpenWeatherMap (optional) | Same forecast when `OWM_API_KEY` is set | `OWM_API_KEY` in `.env` | **Live** when configured |
| PondScale market feed (`/api/market/prices`, `/api/market/history`) | Daily price per crop, nine crops | none (self-hosted) | **Simulated** by default: a deterministic generator (same crop + date always gives the same price). Set `MARKET_API_URL` to point at a real market API — the Live provider takes over and falls back to the simulated feed on any failure. The badge always shows the true source |

**Honesty note:** in the simulated feed, **catfish mirrors tilapia** — its
daily walk is the exact opposite — so the demo always shows one fish price
rising and one falling. This is structural (see `mirrorOf` in
`lib/market/catalog.ts`), not a coincidence, and it is sample data.

Everything else on screen (ponds, checks, feed price, farm settings) is the
farmer's own saved data in Postgres — it is neither "Live" nor "Simulated",
it is *theirs*.

## The three calculations (all pure, all tested in `lib/fcr.ts`)

**FCR (feed conversion ratio)** = feed used (kg) ÷ weight gained (kg), where
weight gained (kg) = fish count × (weight now − weight at start) ÷ 1000.
Two decimals. If the fish did not grow, no FCR is computed (nothing to
divide by) — that check is "No growth".

**Growth (ADG)** = (weight now − weight at start) ÷ days, in grams per fish
per day. FCR alone cannot show underfeeding, so slow growth is judged on ADG
against the species minimum.

**Stock value (Estimated Market Value)** = fish count × weight now (kg) ×
today's price per kg for that species from the market feed. Stored in
integer kobo at save time, so an old check keeps the value it had.

Status decision order: no growth → FCR < 1.0 "check numbers" → FCR > species
limit "too much feed" → ADG < species minimum "slow growth" → else "good".

## Worked example — the demo's Mango Creek check (from `prisma/seed.ts`)

Inputs: 1,000 tilapia · 30-day window · 25 g → 60 g per fish · 55 kg feed ·
feed ₦1,200/kg · tilapia ₦2,500/kg (market feed).

1. Weight gained = 1,000 × (60 − 25) ÷ 1,000 = **35 kg**
2. FCR = 55 ÷ 35 = **1.57** (between 1.0 and the tilapia limit 1.8)
3. ADG = (60 − 25) ÷ 30 = **1.17 g per fish per day** (≥ tilapia minimum 1.0)
   → status **Good** — "Feeding is right. Keep going."
4. Feed cost per kg gained = 1.57 × ₦1,200 = **₦1,884 per kg**
5. Stock value = 1,000 × 0.060 kg × ₦2,500 = **₦150,000**
6. Margin hint = ₦2,500 − ₦1,884 = **₦616 more earned than feed costs, per kg gained**

The seeded farm shows all five statuses side by side (Good, Slow growth,
Too much feed, Check numbers, No growth), so every state is one click away.
