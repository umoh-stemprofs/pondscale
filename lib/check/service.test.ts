import type { CheckStatus, Species } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  CHECK_OWNERSHIP_ERROR,
  FISH_PRICE_ERROR,
  POND_OWNERSHIP_ERROR,
  checkForFarm,
  deleteCheckForFarm,
  listChecksForFarm,
  saveCheckForFarm,
  type CheckStore,
  type SavedCheck,
} from "./service";

// Step 4B rules (docs/02-pondscale.md + docs/00-global.md §2/§3): the server
// recomputes every stored number from the five typed inputs (a browser that
// sends a forged fcr or stock value is ignored), ownership is part of the
// WHERE clause for read/save/delete/list, each of the five statuses is
// reachable through the save path, and a missing feed price still saves the
// status and growth with a null feed cost.

const FISH_PRICE_KOBO = 250_000; // ₦2,500 per kg
const FEED_PRICE_KOBO = 120_000; // ₦1,200 per kg
const DATE = new Date("2026-10-19T00:00:00.000Z");

interface PondRow {
  id: string;
  farmId: string;
  name: string;
  species: Species;
}

const PONDS: PondRow[] = [
  { id: "pond-a1", farmId: "farm-a", name: "Mango Creek", species: "TILAPIA" },
  { id: "pond-b1", farmId: "farm-b", name: "Other Farm Pond", species: "CATFISH" },
];

/// In-memory store that behaves like the database: it filters on BOTH the id
/// and the farmId, so a test fails if scoping is dropped from the query, not
/// just if the result is checked afterwards.
function memoryStore(opts: {
  ponds: PondRow[];
  feedPriceKobo?: number | null;
  checks?: SavedCheck[];
}) {
  const checks: SavedCheck[] = opts.checks ? [...opts.checks] : [];
  const created: SavedCheck[] = [];
  const pondQueries: { id: string; farmId: string }[] = [];
  const checkQueries: { id: string; pond: { farmId: string } }[] = [];
  let nextId = 1;

  const pondOf = (pondId: string): PondRow | undefined =>
    opts.ponds.find((pond) => pond.id === pondId);

  const store: CheckStore = {
    pond: {
      findFirst: async ({ where }) => {
        pondQueries.push(where);
        return opts.ponds.find((p) => p.id === where.id && p.farmId === where.farmId) ?? null;
      },
    },
    feedPrice: {
      findUnique: async () =>
        opts.feedPriceKobo === undefined || opts.feedPriceKobo === null
          ? null
          : { priceKobo: opts.feedPriceKobo },
    },
    check: {
      create: async ({ data }) => {
        const row: SavedCheck = {
          createdAt: new Date(0),
          ...data,
          id: `chk-${nextId++}`,
        };
        checks.push(row);
        created.push(row);
        return { id: row.id };
      },
      findFirst: async ({ where }) => {
        checkQueries.push(where);
        return (
          checks.find((check) => {
            const pond = pondOf(check.pondId);
            return check.id === where.id && pond !== undefined && pond.farmId === where.pond.farmId;
          }) ?? null
        );
      },
      findMany: async ({ where }) =>
        checks
          .filter((check) => {
            const pond = pondOf(check.pondId);
            if (pond === undefined || pond.farmId !== where.pond.farmId) return false;
            return where.pondId === undefined || check.pondId === where.pondId;
          })
          .sort((a, b) => b.date.getTime() - a.date.getTime()),
      delete: async ({ where }) => {
        const index = checks.findIndex((check) => check.id === where.id);
        if (index >= 0) checks.splice(index, 1);
        return {};
      },
    },
  };

  return { store, checks, created, pondQueries, checkQueries };
}

function savedCheck(id: string, pondId: string, dateIso: string): SavedCheck {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  return {
    id,
    pondId,
    date,
    fishCount: 100,
    days: 30,
    startG: 25,
    currentG: 60,
    feedKg: 15,
    status: "GOOD",
    fcr: 1.5,
    adgGPerDay: 1.17,
    feedCostPerKgGainKobo: 180_000,
    stockValueKobo: 1_500_000,
    fishPriceKobo: FISH_PRICE_KOBO,
    createdAt: date,
  };
}

const fishPrice = () => Promise.resolve(FISH_PRICE_KOBO);

function saveArgs(store: CheckStore, overrides: Partial<Parameters<typeof saveCheckForFarm>[1]>) {
  return saveCheckForFarm(store, {
    farmId: "farm-a",
    pondId: "pond-a1",
    numbers: { fishCount: 1000, days: 30, startG: 25, currentG: 60, feedKg: 55 },
    date: DATE,
    fishPriceFor: fishPrice,
    ...overrides,
  });
}

describe("saveCheckForFarm — the five statuses", () => {
  const CASES: {
    label: CheckStatus;
    species: Species;
    numbers: { fishCount: number; days: number; startG: number; currentG: number; feedKg: number };
    fcr: number | null;
  }[] = [
    {
      label: "GOOD",
      species: "TILAPIA",
      numbers: { fishCount: 1000, days: 30, startG: 25, currentG: 60, feedKg: 55 },
      fcr: 1.57,
    },
    {
      label: "SLOW_GROWTH",
      species: "TILAPIA",
      numbers: { fishCount: 500, days: 30, startG: 25, currentG: 45, feedKg: 15 },
      fcr: 1.5,
    },
    {
      label: "TOO_MUCH_FEED",
      species: "CATFISH",
      numbers: { fishCount: 200, days: 30, startG: 50, currentG: 110, feedKg: 30 },
      fcr: 2.5,
    },
    {
      label: "CHECK_NUMBERS",
      species: "TILAPIA",
      numbers: { fishCount: 1000, days: 30, startG: 100, currentG: 160, feedKg: 40 },
      fcr: 0.67,
    },
    {
      label: "NO_GROWTH",
      species: "TILAPIA",
      numbers: { fishCount: 800, days: 14, startG: 40, currentG: 38, feedKg: 35 },
      fcr: null,
    },
  ];

  for (const testCase of CASES) {
    it(`saves ${testCase.label} with recomputed values`, async () => {
      const { store, created } = memoryStore({
        ponds: [{ id: "pond-a1", farmId: "farm-a", name: "Pond", species: testCase.species }],
        feedPriceKobo: FEED_PRICE_KOBO,
      });
      const result = await saveArgs(store, { numbers: testCase.numbers });
      expect(result.ok).toBe(true);
      expect(created).toHaveLength(1);
      expect(created[0].status).toBe(testCase.label);
      expect(created[0].fcr).toBe(testCase.fcr);
      expect(created[0].fishPriceKobo).toBe(FISH_PRICE_KOBO);
      expect(created[0].date).toEqual(DATE);
    });
  }
});

describe("saveCheckForFarm — the server never trusts the browser", () => {
  it("recomputes every stored number and ignores tampered extras", async () => {
    const { store, created } = memoryStore({
      ponds: [PONDS[0]],
      feedPriceKobo: FEED_PRICE_KOBO,
    });
    const tampered = {
      fishCount: 1000,
      days: 30,
      startG: 25,
      currentG: 60,
      feedKg: 55,
      // Forged results a browser might send — all ignored and recomputed:
      fcr: 99.99,
      status: "GOOD",
      adgGPerDay: 0,
      feedCostPerKgGainKobo: 1,
      stockValueKobo: 1,
    };
    const result = await saveArgs(store, { numbers: tampered });
    expect(result.ok).toBe(true);
    const row = created[0];
    expect(row.fcr).toBe(1.57); // 55 kg feed ÷ 35 kg gain
    expect(row.stockValueKobo).toBe(15_000_000); // 1000 × 60 g × ₦2,500
    expect(row.feedCostPerKgGainKobo).toBe(188_400); // 1.57 × ₦1,200
    expect(row.adgGPerDay).toBeCloseTo(1.17, 2); // 35 g ÷ 30 days
  });

  it("rejects invalid numbers with one sentence and writes nothing", async () => {
    const { store, created } = memoryStore({ ponds: [PONDS[0]], feedPriceKobo: FEED_PRICE_KOBO });

    const noFeed = await saveArgs(store, { numbers: { fishCount: 10, days: 30, startG: 25, currentG: 60, feedKg: 0 } });
    expect(noFeed).toEqual({ ok: false, error: "Enter the feed used as a number above 0 kg." });

    const noFish = await saveArgs(store, { numbers: { fishCount: 0, days: 30, startG: 25, currentG: 60, feedKg: 5 } });
    expect(noFish).toEqual({ ok: false, error: "Enter at least 1 fish." });

    expect(created).toHaveLength(0);
  });

  it("refuses to save when the market price is unavailable", async () => {
    const { store, created } = memoryStore({ ponds: [PONDS[0]], feedPriceKobo: FEED_PRICE_KOBO });
    const result = await saveArgs(store, { fishPriceFor: () => Promise.resolve(null) });
    expect(result).toEqual({ ok: false, error: FISH_PRICE_ERROR });
    expect(created).toHaveLength(0);
  });
});

describe("saveCheckForFarm — a missing feed price", () => {
  it("still saves the status, growth and stock value with a null feed cost", async () => {
    const { store, created } = memoryStore({ ponds: [PONDS[0]], feedPriceKobo: null });
    const result = await saveArgs(store, {});
    expect(result.ok).toBe(true);
    const row = created[0];
    expect(row.status).toBe("GOOD");
    expect(row.fcr).toBe(1.57);
    expect(row.feedCostPerKgGainKobo).toBeNull();
    expect(row.stockValueKobo).toBe(15_000_000); // stock value needs only the fish price
  });
});

describe("ownership — a farmer only ever touches their own checks", () => {
  it("refuses to save a check for another farmer's pond", async () => {
    const { store, created } = memoryStore({ ponds: PONDS, feedPriceKobo: FEED_PRICE_KOBO });
    const result = await saveArgs(store, { pondId: "pond-b1" });
    expect(result).toEqual({ ok: false, error: POND_OWNERSHIP_ERROR });
    expect(created).toHaveLength(0);
  });

  it("never returns another farmer's check, even with the right id", async () => {
    const { store, checkQueries } = memoryStore({
      ponds: PONDS,
      checks: [savedCheck("chk-b1", "pond-b1", "2026-10-10")],
    });
    expect(await checkForFarm(store, "chk-b1", "farm-a")).toBeNull();
    expect((await checkForFarm(store, "chk-b1", "farm-b"))?.id).toBe("chk-b1");
    // Ownership is in the WHERE clause itself.
    expect(checkQueries).toEqual([
      { id: "chk-b1", pond: { farmId: "farm-a" } },
      { id: "chk-b1", pond: { farmId: "farm-b" } },
    ]);
  });

  it("refuses to delete another farmer's check and leaves it in place", async () => {
    const { store, checks } = memoryStore({
      ponds: PONDS,
      checks: [savedCheck("chk-b1", "pond-b1", "2026-10-10")],
    });
    const result = await deleteCheckForFarm(store, "chk-b1", "farm-a");
    expect(result).toEqual({ ok: false, error: CHECK_OWNERSHIP_ERROR });
    expect(checks).toHaveLength(1);
  });

  it("deletes the farmer's own check", async () => {
    const { store, checks } = memoryStore({
      ponds: PONDS,
      checks: [savedCheck("chk-b1", "pond-b1", "2026-10-10")],
    });
    const result = await deleteCheckForFarm(store, "chk-b1", "farm-b");
    expect(result).toEqual({ ok: true });
    expect(checks).toHaveLength(0);
  });

  it("lists only this farm's checks, newest first, optionally per pond", async () => {
    const { store } = memoryStore({
      ponds: PONDS,
      checks: [
        savedCheck("chk-b-old", "pond-b1", "2026-10-01"),
        savedCheck("chk-b-new", "pond-b1", "2026-10-12"),
        savedCheck("chk-a1", "pond-a1", "2026-10-15"),
      ],
    });
    const mine = await listChecksForFarm(store, { farmId: "farm-b" });
    expect(mine.map((check) => check.id)).toEqual(["chk-b-new", "chk-b-old"]);

    const onePond = await listChecksForFarm(store, { farmId: "farm-a" });
    expect(onePond.map((check) => check.id)).toEqual(["chk-a1"]);
  });
});
