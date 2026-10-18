import type { CheckStatus, Species } from "@prisma/client";
import { SPECIES_LIMITS } from "./config";

// Feed conversion check — pure functions only (docs/02-pondscale.md "Logic").
// No database, no network, no Date.now(): the wizard feeds numbers in, the
// result screen renders what comes out. Screens come later; this is step 3.

export interface FcrInput {
  species: Species;
  fishCount: number; // fish alive now
  days: number; // length of the check window
  startG: number; // weight at the start, grams per fish
  currentG: number; // weight now, grams per fish
  feedKg: number; // feed used in the window, kg
  /// Feed price in kobo per kg (integer kobo, ₦1 = 100 kobo).
  feedPriceKobo: number;
  /// Fish price from the market feed, in kobo per kg (integer kobo).
  fishPriceKobo: number;
}

export type FcrFailure = {
  ok: false;
  /// One plain sentence saying what to fix (docs/00-global.md §6).
  error: string;
};

export type FcrResult = {
  ok: true;
  status: CheckStatus;
  /// The exact action sentence for the status (docs/02-pondscale.md rules 1, 4–7).
  message: string;
  /// Set when days < 7 — a note, never a blocking error.
  note: string | null;
  /// NO_GROWTH has no gain to divide by → these four stay null.
  gainKg: number | null;
  fcr: number | null; // feedKg / gainKg, rounded to 2 decimals
  adgGPerDay: number | null; // (currentG - startG) / days
  /// Money, integer kobo.
  feedCostPerKgGainKobo: number | null; // FCR × feed price
  stockValueKobo: number; // fish count × current weight in kg × fish price
  /// fish price − feed cost per kg gained; negative → warning message below.
  marginPerKgKobo: number | null;
  marginMessage: string | null;
};

export type FcrOutcome = FcrResult | FcrFailure;

/// Exact strings from docs/02-pondscale.md — tests pin these.
export const FCR_MESSAGES = {
  NO_GROWTH: "Fish did not grow. Check fish health and water.",
  CHECK_NUMBERS: "Numbers look wrong. Check them again.",
  TOO_MUCH_FEED: "Reduce feed by 10%.",
  SLOW_GROWTH: "Fish grow slowly. Add 10% feed. Still slow? Ask a fish expert.",
  GOOD: "Feeding is right. Keep going.",
} as const;

export const FCR_SHORT_NOTE = "Check over at least 7 days for a fair answer";
export const NEGATIVE_MARGIN_MESSAGE = "Feed costs more than the fish earn.";

const WEIGHT_MAX_G = 5000;
const round2 = (x: number) => Math.round(x * 100) / 100;
const kobo = (x: number) => Math.round(x);

function validate(input: FcrInput): string | null {
  if (!Number.isInteger(input.fishCount) || input.fishCount < 1) {
    return "Enter at least 1 fish.";
  }
  if (!Number.isInteger(input.days) || input.days < 1) {
    return "Enter at least 1 day.";
  }
  if (!(input.startG > 0) || input.startG > WEIGHT_MAX_G) {
    return "Enter a start weight above 0 g and at most 5000 g.";
  }
  if (!(input.currentG > 0) || input.currentG > WEIGHT_MAX_G) {
    return "Enter a current weight above 0 g and at most 5000 g.";
  }
  if (!(input.feedKg > 0)) {
    return "Enter the feed used as a number above 0 kg.";
  }
  if (!(input.feedPriceKobo > 0)) {
    return "Set the feed price in kobo per kg.";
  }
  if (!(input.fishPriceKobo > 0)) {
    return "Set the fish price in kobo per kg.";
  }
  return null;
}

export function evaluateCheck(input: FcrInput): FcrOutcome {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const limits = SPECIES_LIMITS[input.species];

  // Stock value is computed for every status, including NO_GROWTH.
  const stockValueKobo = kobo(input.fishCount * (input.currentG / 1000) * input.fishPriceKobo);
  const note = input.days < 7 ? FCR_SHORT_NOTE : null;

  // Rule 1: no growth → no FCR at all (there is no gain to divide by).
  if (input.currentG <= input.startG) {
    return {
      ok: true,
      status: "NO_GROWTH",
      message: FCR_MESSAGES.NO_GROWTH,
      note,
      gainKg: null,
      fcr: null,
      adgGPerDay: null,
      feedCostPerKgGainKobo: null,
      stockValueKobo,
      marginPerKgKobo: null,
      marginMessage: null,
    };
  }

  // Rules 2–3: the maths.
  const gainKg = (input.fishCount * (input.currentG - input.startG)) / 1000;
  const rawFcr = input.feedKg / gainKg;
  const fcr = Math.round(rawFcr * 100) / 100; // 2 decimals
  const adgGPerDay = (input.currentG - input.startG) / input.days;

  // Rules 4–7 in exactly this order: CHECK_NUMBERS → TOO_MUCH_FEED →
  // SLOW_GROWTH → GOOD. Comparisons use the raw ratio so the exact
  // boundaries (1.0, fcrMax) behave as the plan words them.
  const status: CheckStatus =
    rawFcr < 1.0
      ? "CHECK_NUMBERS"
      : rawFcr > limits.fcrMax
        ? "TOO_MUCH_FEED"
        : adgGPerDay < limits.adgMin
          ? "SLOW_GROWTH"
          : "GOOD";

  // Rule 8: money in integer kobo, from the rounded FCR.
  const feedCostPerKgGainKobo = kobo(fcr * input.feedPriceKobo);
  const marginPerKgKobo = input.fishPriceKobo - feedCostPerKgGainKobo;

  return {
    ok: true,
    status,
    message: FCR_MESSAGES[status],
    note,
    gainKg: Math.round(gainKg * 100) / 100,
    fcr,
    adgGPerDay: round2(adgGPerDay),
    feedCostPerKgGainKobo,
    stockValueKobo,
    marginPerKgKobo,
    marginMessage: marginPerKgKobo < 0 ? NEGATIVE_MARGIN_MESSAGE : null,
  };
}