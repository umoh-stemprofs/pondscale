import type { Crop, Unit } from "@prisma/client";

// Market catalog (docs/00-global.md §3). Base prices are the sample numbers
// from the plan, in integer kobo (₦1 = 100 kobo). Edit to match local
// markets — they are PLACEHOLDERS until an expert reviews them.

export const MARKET_START_DATE = "2026-01-01";

export interface CropConfig {
  crop: Crop;
  /// ₦ per unit, in kobo. MAIZE ₦600/kg = 60000.
  basePriceKobo: number;
  unit: Unit;
  /// Seed for the deterministic generator. Each crop's salt is chosen so the
  /// demo shows every state (see the trends test in lib/market/generator.test.ts).
  salt: string;
  /// When set, this crop's daily noise is the mirror image of the named
  /// crop's, so the two walk in exact opposite directions (their x series
  /// are negatives of each other). Catfish mirrors tilapia: the fish screens
  /// then ALWAYS show one rising and one falling arrow — the demo rule from
  /// docs/00-global.md §3, made structural. A pure random walk made all nine
  /// crops move the same way about one day in thirty, which broke the trends
  /// test whenever the calendar moved past the day the salts were tuned.
  /// Sample data — an expert must review it before any real use.
  mirrorOf?: Crop;
}

export const CATALOG: readonly CropConfig[] = [
  { crop: "MAIZE", basePriceKobo: 60_000, unit: "KG", salt: "maize-ng-2026" },
  { crop: "CASSAVA", basePriceKobo: 35_000, unit: "KG", salt: "cassava-ng-2026" },
  { crop: "YAM", basePriceKobo: 90_000, unit: "KG", salt: "yam-ng-2026" },
  { crop: "RICE_PADDY", basePriceKobo: 85_000, unit: "KG", salt: "rice-ng-2026" },
  { crop: "TOMATO", basePriceKobo: 70_000, unit: "KG", salt: "tomato-ng-2026" },
  { crop: "TILAPIA", basePriceKobo: 250_000, unit: "KG", salt: "tilapia-ng-2026" },
  // Catfish mirrors tilapia: the fish screens always show one arrow up and
  // one arrow down, whatever day the demo is recorded (see mirrorOf above).
  { crop: "CATFISH", basePriceKobo: 280_000, unit: "KG", salt: "catfish-ng-2026", mirrorOf: "TILAPIA" },
  { crop: "EGGS_TRAY", basePriceKobo: 380_000, unit: "TRAY", salt: "eggs-ng-2026" },
  { crop: "PALM_OIL", basePriceKobo: 180_000, unit: "LITRE", salt: "palmoil-ng-2026" },
] as const satisfies readonly CropConfig[];

export const CROPS: readonly Crop[] = CATALOG.map((entry) => entry.crop);

const BY_CROP = new Map<Crop, CropConfig>(CATALOG.map((entry) => [entry.crop, entry]));

export function catalogEntry(crop: Crop): CropConfig {
  const entry = BY_CROP.get(crop);
  if (!entry) throw new Error(`Unknown crop: ${crop}`);
  return entry;
}