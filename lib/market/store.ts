import type { Prisma } from "@prisma/client";
import { db } from "../db";
import type { MarketQuote } from "./provider";

/// Cache the latest quotes in PriceTick, so later screens (estimated market
/// value, history chart) read exactly the numbers the feed served. Prices are
/// computed, never awaited from the database, so a cache failure must not
/// fail the API — it only logs a warning.
export async function cacheQuotes(quotes: MarketQuote[]): Promise<void> {
  try {
    await db.$transaction(
      quotes.map((quote) => {
        const date = new Date(`${quote.date}T00:00:00.000Z`);
        return db.priceTick.upsert({
          where: { crop_date: { crop: quote.crop, date } },
          update: { priceKobo: quote.priceKobo, unit: quote.unit, source: quote.source },
          create: {
            crop: quote.crop,
            date,
            priceKobo: quote.priceKobo,
            unit: quote.unit,
            source: quote.source,
          },
        });
      }),
    );
  } catch (error) {
    console.warn(
      "Price cache write failed:",
      error instanceof Error ? error.message : String(error),
    );
  }
}