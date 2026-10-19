import type { Crop } from "@prisma/client";
import { addDaysIso, daysBetweenIso } from "../dates";
import { catalogEntry, MARKET_START_DATE, type CropConfig } from "./catalog";

// Deterministic price generator (docs/00-global.md §3): the same crop and
// date always produce the same price, on any machine, at any time.
//
//   x[0] = 0 at START_DATE (2026-01-01)
//   x[k] = x[k-1] - 0.03 * x[k-1] + e[k],  e[k] = (rand - 0.5) * 2 * 0.025
//   rand = mulberry32(hash(crop + salt + k))(),  x clamped to ±0.35
//   price = round(basePriceKobo * exp(x[k]))
//
// A crop with `mirrorOf` set uses the MIRRORED noise of that crop (e[k] =
// −e[k] of the other), so with x[0] = 0 its x series is the exact negative:
// tilapia and catfish always move in opposite directions (catalog.ts).

const DECAY = 0.03;
const NOISE_MAX = 0.025;
const X_LIMIT = 0.35;

/** Small, fast, seedable PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, 32-bit. Stable across machines and Node versions. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const clampX = (x: number) => Math.min(X_LIMIT, Math.max(-X_LIMIT, x));

/** The log-return walk x[0..dayIndex] for one crop (x[0] = 0). */
export function xSeries(cfg: CropConfig, dayIndex: number): number[] {
  const xs = [0];
  for (let k = 1; k <= dayIndex; k++) {
    // A mirrored crop draws the other crop's noise and flips its sign.
    const noiseCfg = cfg.mirrorOf ? catalogEntry(cfg.mirrorOf) : cfg;
    const rand = mulberry32(hashString(noiseCfg.crop + noiseCfg.salt + k))();
    const e = (rand - 0.5) * 2 * NOISE_MAX * (cfg.mirrorOf ? -1 : 1);
    xs.push(clampX(xs[k - 1] - DECAY * xs[k - 1] + e));
  }
  return xs;
}

/** Price (integer kobo) for one crop on one calendar day. */
export function priceOnDate(crop: Crop | CropConfig, isoDate: string): number {
  const cfg = typeof crop === "string" ? catalogEntry(crop) : crop;
  const dayIndex = daysBetweenIso(MARKET_START_DATE, isoDate);
  if (dayIndex < 0) {
    throw new Error(`Date ${isoDate} is before the market start ${MARKET_START_DATE}`);
  }
  const x = xSeries(cfg, dayIndex)[dayIndex];
  return Math.round(cfg.basePriceKobo * Math.exp(x));
}

export interface PricePoint {
  date: string;
  priceKobo: number;
}

/** The last `days` daily prices, ascending by date, ending at `endDateIso`. */
export function priceHistory(
  crop: Crop | CropConfig,
  endDateIso: string,
  days: number,
): PricePoint[] {
  const cfg = typeof crop === "string" ? catalogEntry(crop) : crop;
  const points: PricePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDaysIso(endDateIso, -i);
    points.push({ date, priceKobo: priceOnDate(cfg, date) });
  }
  return points;
}

/** Percentage change from the previous day to `isoDate`, one decimal. */
export function changePctOn(crop: Crop | CropConfig, isoDate: string): number {
  const today = priceOnDate(crop, isoDate);
  const yesterday = priceOnDate(crop, addDaysIso(isoDate, -1));
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10;
}