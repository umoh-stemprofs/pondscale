import type { CheckStatus, Crop, Species } from "@prisma/client";

// Display formatting (docs/00-global.md §2 and design.md §6): money as
// "₦12,500", dates as "Mon 20 Oct", no ALL CAPS labels. Pure and shared by
// server pages and client components.
//
// Deliberately NOT using toLocaleString: Node and the browser ship different
// ICU data (en-GB gives "Wed, 30 Sept" in one and "Wed 30 Sept" in the other),
// which makes server HTML differ from the hydrated client and breaks React
// hydration. These small helpers give the same text everywhere.

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parseIsoDay(input: string | Date): { y: number; m: number; d: number } {
  const iso = typeof input === "string" ? input : input.toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function utcDate({ y, m, d }: { y: number; m: number; d: number }): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

/** Thousands separators, e.g. 3500 → "3,500". */
export function groupThousands(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Count with separators, e.g. 3500 → "3,500". */
export function fmtCount(value: number): string {
  return groupThousands(String(Math.round(value)));
}

/** Integer kobo → "₦12,500" (fractions shown as "₦1,884.50"). */
export function naira(kobo: number): string {
  const sign = kobo < 0 ? "−" : "";
  const value = Math.abs(kobo) / 100;
  const digits = kobo % 100 === 0 ? value.toFixed(0) : value.toFixed(2);
  const [whole, fraction] = digits.split(".");
  return `${sign}₦${groupThousands(whole)}${fraction ? `.${fraction}` : ""}`;
}

/** "YYYY-MM-DD" or Date → "Mon 20 Oct" (no year, sentence case). */
export function fmtDay(input: string | Date): string {
  const parts = parseIsoDay(input);
  return `${WEEKDAY[utcDate(parts).getUTCDay()]} ${parts.d} ${MONTH[parts.m - 1]}`;
}

/** "YYYY-MM-DD" or Date → "19 Oct" (compact chart axis labels). */
export function fmtDayShort(input: string | Date): string {
  const parts = parseIsoDay(input);
  return `${parts.d} ${MONTH[parts.m - 1]}`;
}

/** "YYYY-MM-DD" → "Mon" (weekday column heads). */
export function fmtWeekday(iso: string): string {
  return WEEKDAY[utcDate(parseIsoDay(iso)).getUTCDay()];
}

const SPECIES_LABEL: Record<Species, string> = {
  TILAPIA: "Tilapia",
  CATFISH: "Catfish",
};

export function speciesLabel(species: Species): string {
  return SPECIES_LABEL[species];
}

const CROP_LABEL: Record<Crop, string> = {
  MAIZE: "Maize",
  CASSAVA: "Cassava",
  YAM: "Yam",
  RICE_PADDY: "Rice paddy",
  TOMATO: "Tomato",
  TILAPIA: "Tilapia",
  CATFISH: "Catfish",
  EGGS_TRAY: "Eggs (tray of 30)",
  PALM_OIL: "Palm oil",
};

export function cropLabel(crop: Crop): string {
  return CROP_LABEL[crop];
}

/** FCR at 2 decimals, or "—" when there is no FCR (NO_GROWTH). */
export function fmtFcr(fcr: number | null): string {
  return fcr === null ? "—" : fcr.toFixed(2);
}
