import { APP_TZ } from "@/lib/config";

// Calendar-day helpers. All "today" decisions use APP_TZ (default
// Africa/Lagos), never the server's clock zone (docs/00-global.md §2).

/** Today's calendar day in APP_TZ as "YYYY-MM-DD". */
export function todayIso(tz: string = APP_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "YYYY-MM-DD" for n days before (or after, if negative) `iso`. */
export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" for n days before today in APP_TZ. */
export function isoDaysAgo(n: number, tz: string = APP_TZ): string {
  return addDaysIso(todayIso(tz), -n);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetweenIso(a: string, b: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}