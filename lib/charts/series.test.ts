import { describe, expect, it } from "vitest";
import {
  fcrSeries,
  growthSeries,
  groupTopSlices,
  OTHER_SLICE_NAME,
  valueByPond,
  type DatedCheck,
} from "./series";

// Chart-helper rules (docs/design.md §4 + step 5): gaps for missing values,
// never invented numbers; the pie shows at most 5 slices with the rest as
// "Other"; ordering is stable. Every fixture is a fixed date string, so the
// suite passes on any day (step 5 rule 0).

const check = (date: string, fcr: number | null, adgGPerDay: number): DatedCheck => ({
  date,
  fcr,
  adgGPerDay,
});

describe("fcrSeries", () => {
  it("returns an empty series when there are no checks", () => {
    expect(fcrSeries([])).toEqual([]);
  });

  it("returns one point for one check", () => {
    expect(fcrSeries([check("2026-10-12", 1.57, 1.17)])).toEqual([
      { date: "2026-10-12", fcr: 1.57 },
    ]);
  });

  it("keeps a NO_GROWTH check as a gap (null), never zero", () => {
    const series = fcrSeries([
      check("2026-10-01", 1.5, 0.8),
      check("2026-10-08", null, -0.14),
      check("2026-10-15", 1.6, 1.2),
    ]);
    expect(series.map((point) => point.fcr)).toEqual([1.5, null, 1.6]);
  });

  it("sorts checks given in any order, oldest first", () => {
    const series = fcrSeries([
      check("2026-10-15", 1.6, 1.2),
      check("2026-10-01", 1.5, 0.8),
      check("2026-10-08", 1.55, 0.9),
    ]);
    expect(series.map((point) => point.date)).toEqual([
      "2026-10-01",
      "2026-10-08",
      "2026-10-15",
    ]);
  });
});

describe("growthSeries", () => {
  it("is empty with no checks and keeps negative growth as typed", () => {
    expect(growthSeries([])).toEqual([]);
    const series = growthSeries([
      check("2026-10-08", null, -0.14),
      check("2026-10-01", 1.5, 0.8),
    ]);
    expect(series).toEqual([
      { date: "2026-10-01", adgGPerDay: 0.8 },
      { date: "2026-10-08", adgGPerDay: -0.14 },
    ]);
  });
});

describe("valueByPond", () => {
  it("sorts by value descending and breaks ties by name", () => {
    const sorted = valueByPond([
      { name: "Small", valueKobo: 100_000 },
      { name: "Big", valueKobo: 900_000 },
      { name: "Zebra", valueKobo: 500_000 },
      { name: "Alpha", valueKobo: 500_000 },
    ]);
    expect(sorted.map((row) => row.name)).toEqual(["Big", "Alpha", "Zebra", "Small"]);
  });

  it("drops rows without value instead of inventing slices", () => {
    expect(valueByPond([{ name: "Empty pond", valueKobo: 0 }])).toEqual([]);
  });
});

describe("groupTopSlices", () => {
  it("returns everything unchanged with 5 ponds or fewer", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      name: `Pond ${i + 1}`,
      valueKobo: (5 - i) * 100,
    }));
    expect(groupTopSlices(rows)).toHaveLength(5);
    expect(groupTopSlices(rows).some((row) => row.name === OTHER_SLICE_NAME)).toBe(false);
  });

  it("keeps at most 5 slices with more than 5 ponds and merges the rest as Other", () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      name: `Pond ${String.fromCharCode(65 + i)}`, // A..H, all different values
      valueKobo: (8 - i) * 100,
    }));
    const slices = groupTopSlices(rows);
    expect(slices).toHaveLength(5);
    expect(slices.map((row) => row.name)).toEqual([
      "Pond A",
      "Pond B",
      "Pond C",
      "Pond D",
      OTHER_SLICE_NAME,
    ]);
    // Other = E + F + G + H = 400 + 300 + 200 + 100
    expect(slices[4].valueKobo).toBe(1000);
  });

  it("honours a smaller slice budget", () => {
    const rows = [
      { name: "A", valueKobo: 500 },
      { name: "B", valueKobo: 300 },
      { name: "C", valueKobo: 200 },
    ];
    const slices = groupTopSlices(rows, 2);
    expect(slices).toEqual([
      { name: "A", valueKobo: 500 },
      { name: OTHER_SLICE_NAME, valueKobo: 500 },
    ]);
  });
});
