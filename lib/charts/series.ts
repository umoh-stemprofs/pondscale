// Pure chart helpers (docs/00-global.md §2: logic lives in /lib with tests).
// Given rows in, series out — the chart and its "View as table" render the
// SAME arrays, so the table can never disagree with the picture. No clock,
// no DOM, no dates invented: every helper is deterministic and date-free.

export interface DatedCheck {
  date: Date | string;
  fcr: number | null;
  adgGPerDay: number;
}

/// One point of the FCR line. `fcr: null` means NO_GROWTH — the chart draws
/// a gap there, never an invented number (docs/design.md §4: no data ≠ 0).
export interface FcrPoint {
  date: string; // YYYY-MM-DD
  fcr: number | null;
}

export interface GrowthPoint {
  date: string; // YYYY-MM-DD
  adgGPerDay: number; // g per fish per day; may be negative
}

export interface ValueSlice {
  name: string;
  valueKobo: number;
}

export const OTHER_SLICE_NAME = "Other";

const isoOf = (date: Date | string): string =>
  typeof date === "string" ? date : date.toISOString().slice(0, 10);

function sortAscByDate<T extends { date: Date | string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => isoOf(a.date).localeCompare(isoOf(b.date)));
}

/** Checks (any order) → FCR points oldest first, nulls kept as gaps. */
export function fcrSeries(checks: readonly DatedCheck[]): FcrPoint[] {
  return sortAscByDate(checks).map((check) => ({
    date: isoOf(check.date),
    fcr: check.fcr,
  }));
}

/** Checks (any order) → growth points oldest first. */
export function growthSeries(checks: readonly DatedCheck[]): GrowthPoint[] {
  return sortAscByDate(checks).map((check) => ({
    date: isoOf(check.date),
    adgGPerDay: check.adgGPerDay,
  }));
}

/** Value slices sorted biggest first; ties broken by name so the order is
 *  stable on any machine and any day. Ponds without value are dropped —
 *  the charts never invent a slice. */
export function valueByPond(rows: readonly ValueSlice[]): ValueSlice[] {
  return rows
    .filter((row) => row.valueKobo > 0)
    .sort((a, b) => b.valueKobo - a.valueKobo || a.name.localeCompare(b.name));
}

/**
 * Pie slices: at most `maxSlices` in total — the biggest ones by name, with
 * everything beyond them merged into one "Other" slice (design.md §4: pie
 * max 5 slices, rest = "Other").
 */
export function groupTopSlices(rows: readonly ValueSlice[], maxSlices = 5): ValueSlice[] {
  const sorted = valueByPond(rows);
  if (sorted.length <= maxSlices) return sorted;
  const top = sorted.slice(0, maxSlices - 1);
  const rest = sorted.slice(maxSlices - 1);
  const otherKobo = rest.reduce((sum, row) => sum + row.valueKobo, 0);
  return [...top, { name: OTHER_SLICE_NAME, valueKobo: otherKobo }];
}
