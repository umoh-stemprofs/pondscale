import type { Species } from "@prisma/client";
import { evaluateCheck, type FcrOutcome } from "@/lib/fcr";

// Price-aware evaluation shared by the result screen and the save action
// (docs/02-pondscale.md rule 8). evaluateCheck refuses prices ≤ 0 so money
// can never silently become zero; a farm that has not set a feed price still
// gets its status, FCR and growth — we evaluate with a placeholder price and
// strip every money figure that depends on it, so nothing made up ever
// reaches the screen or the database.

/// Shown on the result screen when the farm has no feed price yet.
export const NO_FEED_PRICE_NOTE = "Set the feed price in Settings.";

export interface CheckNumbersInput {
  fishCount: number;
  days: number;
  startG: number;
  currentG: number;
  feedKg: number;
}

export function evaluateWithFarmPrices(args: {
  species: Species;
  numbers: CheckNumbersInput;
  /// null = the farm has not set a feed price yet.
  feedPriceKobo: number | null;
  fishPriceKobo: number;
}): FcrOutcome {
  const hasFeedPrice = args.feedPriceKobo !== null && args.feedPriceKobo > 0;
  const outcome = evaluateCheck({
    species: args.species,
    ...args.numbers,
    feedPriceKobo: hasFeedPrice ? args.feedPriceKobo ?? 0 : 1,
    fishPriceKobo: args.fishPriceKobo,
  });
  if (!outcome.ok || hasFeedPrice) return outcome;
  // No feed price: keep status, FCR, growth and stock value; drop every
  // money figure that would have used the unknown price.
  return {
    ...outcome,
    feedCostPerKgGainKobo: null,
    marginPerKgKobo: null,
    marginMessage: null,
  };
}
