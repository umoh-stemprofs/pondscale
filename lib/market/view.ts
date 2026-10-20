import { Crop } from "@prisma/client";
import { addDaysIso, todayIso } from "../dates";
import { getMarketProvider, type MarketQuote } from "./provider";

// Shared market fetching for pages (dashboard, market page) so the fish
// price cards and the estimated market value always use the same quotes.
//
// Speed (final step): today's and yesterday's quotes are fetched with ONE
// Promise.all — the day-over-day change for every crop comes from those two
// lists, so a page showing all nine crops makes two provider calls, not
// nineteen. Providers treat these calls as independent, so they overlap.

export interface PriceCardData {
  crop: Crop;
  quote: MarketQuote;
  changePct: number | null;
}

/** Both fish crops — what the dashboard and the result screen show. */
export const FISH_CROPS: Crop[] = [Crop.TILAPIA, Crop.CATFISH];

/**
 * Latest quotes for the given crops (default: both fish), each with the
 * percent change vs yesterday. Returns [] when the feed fails — callers show
 * an error state, never invented numbers.
 */
export async function loadPriceCards(
  crops: Crop[] = FISH_CROPS,
): Promise<PriceCardData[]> {
  try {
    const provider = getMarketProvider();
    const yesterday = addDaysIso(todayIso(), -1);
    const [todayQuotes, yesterdayQuotes] = await Promise.all([
      provider.getPrices(),
      provider.getPrices(yesterday),
    ]);
    const previousByCrop = new Map<Crop, number>(
      yesterdayQuotes.map((quote) => [quote.crop, quote.priceKobo]),
    );

    const cards: PriceCardData[] = [];
    for (const crop of crops) {
      const quote = todayQuotes.find((candidate) => candidate.crop === crop);
      if (!quote) continue;
      const previous = previousByCrop.get(crop);
      const changePct =
        previous !== undefined && previous > 0
          ? Math.round(((quote.priceKobo - previous) / previous) * 1000) / 10
          : null;
      cards.push({ crop, quote, changePct });
    }
    return cards;
  } catch {
    return [];
  }
}
