import type { CheckStatus, Species } from "@prisma/client";
import { firstIssue } from "@/lib/auth";
import { pondForFarm, type PondStore } from "@/lib/ownership";
import { checkNumbersSchema } from "@/lib/validation";
import { evaluateWithFarmPrices } from "./evaluate";

// Check persistence, free of Next.js and of Prisma: every function takes a
// store interface so the tests exercise the real scoping without a database
// (same pattern as lib/ownership.ts). Ownership is always part of the WHERE
// clause — a farmer can never read, save, list or delete another farmer's
// check (docs/00-global.md §3). Every stored number is recomputed here from
// the five typed inputs; values sent by the browser are never trusted
// (docs/00-global.md §2).

export interface CheckStore extends PondStore {
  feedPrice: {
    findUnique(args: { where: { farmId: string } }): Promise<{ priceKobo: number } | null>;
  };
  check: {
    create(args: {
      data: {
        pondId: string;
        date: Date;
        fishCount: number;
        days: number;
        startG: number;
        currentG: number;
        feedKg: number;
        status: CheckStatus;
        fcr: number | null;
        adgGPerDay: number;
        feedCostPerKgGainKobo: number | null;
        stockValueKobo: number;
        fishPriceKobo: number;
      };
    }): Promise<{ id: string }>;
    findFirst(args: {
      where: { id: string; pond: { farmId: string } };
    }): Promise<SavedCheck | null>;
    findMany(args: {
      where: { pondId?: string; pond: { farmId: string } };
      orderBy: { date: "desc" };
    }): Promise<SavedCheck[]>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
}

/// The columns of a saved check row (prisma/schema.prisma model Check).
export interface SavedCheck {
  id: string;
  pondId: string;
  date: Date;
  fishCount: number;
  days: number;
  startG: number;
  currentG: number;
  feedKg: number;
  status: CheckStatus;
  fcr: number | null;
  adgGPerDay: number;
  feedCostPerKgGainKobo: number | null;
  stockValueKobo: number;
  fishPriceKobo: number | null;
  createdAt: Date;
}

export const POND_OWNERSHIP_ERROR = "That pond is not on your farm — refresh and try again.";
export const CHECK_OWNERSHIP_ERROR = "That check is not on your farm — refresh and try again.";
export const FISH_PRICE_ERROR =
  "Fish prices are unavailable right now — try again in a few minutes.";

export type SaveCheckOutcome = { ok: true; check: { id: string } } | { ok: false; error: string };

/**
 * Save a check for a pond on this farm. Everything stored is recomputed from
 * the five typed numbers — anything else in `numbers` (a forged fcr, status
 * or stock value) is dropped by Zod and never read. The pond must belong to
 * `farmId`, and the fish price is resolved server-side from the market feed.
 */
export async function saveCheckForFarm(
  store: CheckStore,
  args: {
    farmId: string;
    pondId: string;
    /// Raw input (strings or numbers); validated and re-computed inside.
    numbers: unknown;
    date: Date;
    fishPriceFor: (species: Species) => Promise<number | null>;
  },
): Promise<SaveCheckOutcome> {
  const parsed = checkNumbersSchema.safeParse(args.numbers);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const pond = await pondForFarm(store, args.pondId, args.farmId);
  if (!pond) return { ok: false, error: POND_OWNERSHIP_ERROR };

  const feedRow = await store.feedPrice.findUnique({ where: { farmId: args.farmId } });
  const fishPriceKobo = await args.fishPriceFor(pond.species);
  if (!fishPriceKobo || fishPriceKobo <= 0) return { ok: false, error: FISH_PRICE_ERROR };

  const numbers = parsed.data;
  const outcome = evaluateWithFarmPrices({
    species: pond.species,
    numbers,
    feedPriceKobo: feedRow?.priceKobo ?? null,
    fishPriceKobo,
  });
  if (!outcome.ok) return { ok: false, error: outcome.error }; // unreachable: numbers validated

  // NO_GROWTH has no ADG in the result (there is no growth to average) but
  // the table stores the raw per-day change, which can be negative — the
  // seed writes −0.14 the same way.
  const adgGPerDay =
    outcome.adgGPerDay ?? (numbers.currentG - numbers.startG) / numbers.days;

  const check = await store.check.create({
    data: {
      pondId: pond.id,
      date: args.date,
      fishCount: numbers.fishCount,
      days: numbers.days,
      startG: numbers.startG,
      currentG: numbers.currentG,
      feedKg: numbers.feedKg,
      status: outcome.status,
      fcr: outcome.fcr,
      adgGPerDay,
      feedCostPerKgGainKobo: outcome.feedCostPerKgGainKobo,
      stockValueKobo: outcome.stockValueKobo,
      fishPriceKobo,
    },
  });
  return { ok: true, check };
}

/** One saved check, only when its pond belongs to `farmId`. */
export async function checkForFarm(
  store: CheckStore,
  checkId: string,
  farmId: string,
): Promise<SavedCheck | null> {
  if (!checkId || !farmId) return null;
  return store.check.findFirst({ where: { id: checkId, pond: { farmId } } });
}

/** This farm's saved checks, newest first; optionally one pond only. */
export async function listChecksForFarm(
  store: CheckStore,
  args: { farmId: string; pondId?: string },
): Promise<SavedCheck[]> {
  if (!args.farmId) return [];
  return store.check.findMany({
    where: {
      pond: { farmId: args.farmId },
      ...(args.pondId ? { pondId: args.pondId } : {}),
    },
    orderBy: { date: "desc" },
  });
}

/** Delete one saved check; ownership is part of the WHERE clause. */
export async function deleteCheckForFarm(
  store: CheckStore,
  checkId: string,
  farmId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const check = await checkForFarm(store, checkId, farmId);
  if (!check) return { ok: false, error: CHECK_OWNERSHIP_ERROR };
  await store.check.delete({ where: { id: check.id } });
  return { ok: true };
}
