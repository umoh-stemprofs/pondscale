# Rules checklist — Agriculture ("Agro-Analytics" Farm Dashboard)

Each line of docs/00-global.md §1 (Agriculture), proved with where it lives in
the code. Checked in the full click-through of the final step.

| Rule | Where it is in PondScale | Status |
|---|---|---|
| Prices for at least 3 crops from an API or a simulated live feed | `/market` shows tilapia and catfish as fish cards **plus seven more crops** (maize, cassava, yam, rice paddy, tomato, eggs tray, palm oil) as compact cards — nine crops from one feed. Feed: `lib/market/catalog.ts`, served by `GET /api/market/prices`; cards rendered by `app/(app)/market/page.tsx` + `components/FishPriceCards.tsx` | ✅ |
| Weather forecast for the farm's own coordinates, from a weather API | `/weather` (and the dashboard card) fetch Open-Meteo for the farm's own lat/lon from `Farm` rows. `lib/weather/openMeteo.ts` builds the URL from farm coordinates; `lib/weather/view.ts` falls back to Port Harcourt defaults only when the lookup fails (and says so) | ✅ |
| Inventory + "Estimated Market Value" of stock from current prices | The ponds are the stock. Stock value = fish count × current weight (kg) × today's fish price. Shown as the dashboard "Stock value" stat card, "Stock value by pond" bar chart, "Share of stock value" pie chart, and the result screen's "Stock value of the pond" card (`lib/fcr.ts` rule 8, `app/(app)/page.tsx`, `app/(app)/check/page.tsx`) | ✅ |
| At least one external fetch that works, shown on screen | Open-Meteo forecast call, server-side, 5 s timeout + one retry, cached 30 min. Shown with the green "Live · updated N min ago" badge on the weather card (`lib/weather/service.ts`, `components/WeatherCard.tsx`) | ✅ |
| Line, bar or pie charts for inventory and market trends | Line: "FCR over time" and "Fish prices, last N days". Bar: "Stock value by pond" and "This check against the limit". Pie: "Share of stock value". All Recharts, color-blind-safe palette, "View as table" on each (`components/charts/*`) | ✅ |
| Responsive (phone to desktop) | `components/AppShell.tsx`: 240 px sidebar ≥1024 px, top bar 640–1023 px, bottom nav <640 px. All four pages verified at 1440, 768 and 390 px with no horizontal overflow | ✅ |
| API keys in environment variables only | `OWM_API_KEY`, `MARKET_API_URL`, `SESSION_SECRET`, `DATABASE_URL` come from `.env` (git-ignored) only. Open-Meteo is the default weather provider and needs no key. After `npm run build`, the client bundle is grepped for every key name — none present (proof: "no key names in the browser bundle" below) | ✅ |
| Every data block labeled Live, Saved data or Simulated | `components/DataSourceBadge.tsx`: green dot "Live · updated N min ago", amber clock "Saved data · N h old", blue flask "Simulated". On the weather card, the farm tip, both fish price cards, every compact crop card and every chart card | ✅ |
| Disclaimer: "Decision-support tool. You decide." | Footer of every app page (`components/AppShell.tsx`), login screen (`app/login/page.tsx`), and the error boundary | ✅ |

## No key names in the browser bundle (proof)

After `npm run build`, the client chunks in `.next/static` are grepped for
`SESSION_SECRET`, `DATABASE_URL`, `OWM_API_KEY`, `MARKET_API_URL` and the
demo password. Zero matches — all secrets stay server-side (the client only
ever talks to server actions and pages).

## Sample numbers disclosure

Prices, feed price and the species limits (tilapia/catfish fcrMax 1.8,
adgMin 1.0/2.0) are PLACEHOLDERS from docs/00-global.md §3 and
docs/02-pondscale.md. A fish expert must review them before any real use
(docs/report-notes.md).
