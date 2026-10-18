import { describe, expect, it } from "vitest";
import { isoDaysAgo, todayIso } from "../dates";
import { CATALOG } from "./catalog";
import { changePctOn, priceHistory, priceOnDate } from "./generator";

// The generator must be deterministic — the same crop and date always give
// the same price (docs/00-global.md §3). The trend test prints the 14-day
// trends so the salts can be tuned: today at least one crop must be rising
// and one falling, so the demo shows every state.

const today = todayIso();

describe("market generator", () => {
  it("gives the same price for the same date, every time", () => {
    for (const cfg of CATALOG) {
      const first = priceOnDate(cfg, today);
      // Recompute after other crops were computed in between (order independence).
      for (const other of CATALOG) priceOnDate(other, today);
      expect(priceOnDate(cfg, today)).toBe(first);
      // Same on a fixed past date too.
      expect(priceOnDate(cfg, "2026-03-01")).toBe(priceOnDate(cfg, "2026-03-01"));
    }
  });

  it("keeps every price positive and inside the ±0.35 clamp", () => {
    for (const cfg of CATALOG) {
      for (let i = 0; i < 60; i++) {
        const date = isoDaysAgo(i);
        const price = priceOnDate(cfg, date);
        expect(Number.isInteger(price)).toBe(true);
        expect(price).toBeGreaterThan(0);
        const x = Math.log(price / cfg.basePriceKobo);
        expect(Math.abs(x)).toBeLessThanOrEqual(0.351);
      }
    }
  });

  it("refuses dates before the market start", () => {
    expect(() => priceOnDate(CATALOG[0], "2025-12-31")).toThrow();
  });

  it("prints the 14-day trend for every crop, with one rising and one falling today", () => {
    let rising = 0;
    let falling = 0;

    for (const cfg of CATALOG) {
      const points = priceHistory(cfg, today, 14);
      expect(points).toHaveLength(14);
      expect(points[13].date).toBe(today);

      const pct = changePctOn(cfg, today);
      if (pct > 0) rising++;
      if (pct < 0) falling++;

      const first = points[0].priceKobo;
      const last = points[13].priceKobo;
      const arrow = last > first ? "↑" : last < first ? "↓" : "→";
      console.log(
        `${cfg.crop.padEnd(11)} ${first.toLocaleString("en-NG")} → ${last.toLocaleString("en-NG")} (${arrow} 14d)  today ${pct > 0 ? "+" : ""}${pct}%`,
      );
    }

    expect(rising, "no crop is rising today — adjust the salts").toBeGreaterThan(0);
    expect(falling, "no crop is falling today — adjust the salts").toBeGreaterThan(0);
  });
});