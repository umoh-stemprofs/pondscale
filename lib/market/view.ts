import { Crop } from "@prisma/client";
import { getMarketProvider, type MarketQuote } from "./provider";

// Shared market fetching for pages (dashboard, market page) so the fish
// price cards and the estimated market value always use the same quotes.

export interface PriceCardData {
  crop: Crop;
  quote: MarketQuote;
  changePct: number | null;
}

/**
 * Latest quotes for the given crops (default: both fish), each with the
 * percent change vs yesterday. Returns [] when the feed fails — callers show
 * an error state, never invented numbers.
 */
export async function loadPriceCards(
  crops: Crop[] = [Crop.TILAPIA, Crop.CATFISH],
): Promise<PriceCardData[]> {
  try {
    const provider = getMarketProvider();
    const quotes = await provider.getPrices();
    return await Promise.all(
      crops.map(async (crop) => {
        const quote = quotes.find((q) => q.crop === crop);
        if (!quote) return null;
        const history = await provider.getHistory(crop, 2);
        const previous = history[history.length - 2];
        const changePct =
          previous && previous.priceKobo > 0
            ? Math.round(((quote.priceKobo - previous.priceKobo) / previous.priceKobo) * 1000) / 10
            : null;
        return { crop, quote, changePct };
      }),
    ).then((cards) => cards.filter((card): card is PriceCardData => card !== null));
  } catch {
    return [];
  }
}
