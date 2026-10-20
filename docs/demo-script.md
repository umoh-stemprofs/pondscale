# Demo video script — PondScale (5–7 minutes)

Record at 1440 px, browser full screen. Demo account: see README.
Total target: ~6:30.

## 0:00–0:30 — Hook and login

Screen: `/login`. Say the line: "PondScale answers one question per pond —
is my fish feed right? — and it does the maths in naira."
Click **Try demo account** (button only exists because DEMO_MODE=true).

## 0:30–1:30 — Dashboard

- Four stat cards: ponds, fish in ponds, **stock value ₦…** (Estimated
  Market Value), feed cost per kg gained. Point at the badge: "Simulated —
  this number comes from the market feed, and the badge says so."
- Scroll to the **stock value charts**: bar "Stock value by pond" and pie
  "Share of stock value" (top 5 ponds + "Other"). Click **View as table**
  on the pie — "the same numbers, for anyone who cannot see the colours."
- "My ponds": each pond card shows its last status pill — all five statuses
  exist in the demo data.

## 1:30–2:30 — Live weather call (Network tab)

Open DevTools → **Network tab**, filter Fetch/XHR. Go to `/weather`.
- One request to `api.open-meteo.com` — click it: "This is a real external
  API call, no key needed, made on the server."
- Card shows the green badge **"Live · updated 0 min ago"** and the farm tip
  card repeats it.
- Reload once: "Second reload makes **no** new request — the 30-minute
  snapshot cache."
- Mention the fallback: "If Open-Meteo were down, the card would show the
  last saved forecast with an amber 'Saved data' badge — the rest of the app
  keeps working."

## 2:30–3:15 — Market page (three+ crops)

`/market`: fish cards first (tilapia, catfish — one up arrow, one down
arrow; "in the simulated feed catfish mirrors tilapia, on purpose, so the
demo always shows both directions"). Then **More from the market**: maize,
cassava, yam, rice, tomato, eggs, palm oil — "nine crops, one feed, every
card badged." Toggle **7 / 30 / 90 days** on the price chart; open
**View as table** once.

## 3:15–5:00 — The check that flips from Good to Too much feed

`/check` → pick **Mango Creek** (tilapia).
- Step 1: 1,000 fish · 30 days → Next. Step 2: 25 g → 60 g → Next.
- Step 3: feed **55 kg** → See result.
- Result: **Good** — "Feeding is right. Keep going." FCR 1.57, growth
  1.17 g/day, feed cost ₦1,884/kg, stock value ₦150,000, margin line, and
  the little **"This check against the limit"** bar under the 1.8 line.
- Click **Check again**, change only the feed to **70 kg** → result flips to
  **Too much feed** — "Reduce feed by 10 %." The compare bar now pokes past
  the red limit line. "Same pond, same weights — the feed number alone
  decided it. That 15 kg is the money."
- **Save check** → "Saved." → **View history**.

## 5:00–5:45 — History

`/check/history`: filter chips (All ponds / per pond). Pick a pond →
**FCR over time** line chart with the species limit line and the 1.0 line,
and the **growth** chart under it. "A check with no growth is a gap — the
chart never invents a number." Open one saved check in full, then delete a
check (confirm dialog) — "gone, and the charts update."

## 5:45–6:15 — Ponds and settings

`/ponds`: add a pond (name + species), rename it, delete it with the
confirm dialog. `/settings`: change the feed price, save, note how the
result screen's feed-cost card depends on it. Mention: "coordinates here
are what the weather call uses."

## 6:15–6:45 — Honesty and close

- Log out. Show a **wrong password** attempt: one sentence, "Wrong password
  try again." "Bad input never crashes anything."
- Close on the footer line: **"Decision-support tool. You decide."**
- Voiceover for the last 10 s: "Prices are simulated, the weather is real,
  and the species limits are samples a fish expert must confirm. The code,
  schema and docs are in the repository."

## Optional cutaways (if time allows)

- 390 px phone view of the dashboard (bottom nav).
- The result screen's weather alert banner with the DEMO_MODE switch on.
- `.env` names only (never values) + the grepped client bundle showing zero
  key names.
