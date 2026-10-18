import { describe, expect, it } from "vitest";
import { pondForFarm, type PondStore } from "./ownership";

// Ownership is the security rule from docs/00-global.md §3: a farmer sees only
// their own farm. The store below behaves like the database — it filters on
// BOTH id and farmId — so the test fails if the scoping is ever dropped from
// the query, not just if the result is checked afterwards.

type SpeciesKey = "TILAPIA" | "CATFISH";

interface Row {
  id: string;
  farmId: string;
  name: string;
  species: SpeciesKey;
}

function memoryStore(rows: Row[]) {
  const queries: { id: string; farmId: string }[] = [];
  const store: PondStore = {
    pond: {
      findFirst: async ({ where }) => {
        queries.push(where);
        return rows.find((row) => row.id === where.id && row.farmId === where.farmId) ?? null;
      },
    },
  };
  return { store, queries };
}

const rows: Row[] = [
  { id: "pond-a1", farmId: "farm-a", name: "Pond 1", species: "TILAPIA" },
  { id: "pond-b1", farmId: "farm-b", name: "Pond 1", species: "CATFISH" },
];

describe("pondForFarm", () => {
  it("returns a pond that belongs to the farmer's farm", async () => {
    const { store } = memoryStore(rows);
    const pond = await pondForFarm(store, "pond-a1", "farm-a");
    expect(pond?.id).toBe("pond-a1");
  });

  it("never returns another farmer's pond, even with the right id", async () => {
    const { store } = memoryStore(rows);
    expect(await pondForFarm(store, "pond-a1", "farm-b")).toBeNull();
    expect(await pondForFarm(store, "pond-b1", "farm-a")).toBeNull();
  });

  it("scopes the query itself (farmId is in the WHERE clause)", async () => {
    const { store, queries } = memoryStore(rows);
    await pondForFarm(store, "pond-a1", "farm-a");
    expect(queries).toEqual([{ id: "pond-a1", farmId: "farm-a" }]);
  });

  it("returns null without querying for a missing pond id or farm id", async () => {
    const { store, queries } = memoryStore(rows);
    expect(await pondForFarm(store, "", "farm-a")).toBeNull();
    expect(await pondForFarm(store, "pond-a1", "")).toBeNull();
    expect(queries).toHaveLength(0);
  });
});
