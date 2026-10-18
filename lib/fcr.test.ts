import { describe, expect, it } from "vitest";
import {
  FCR_MESSAGES,
  FCR_SHORT_NOTE,
  NEGATIVE_MARGIN_MESSAGE,
  evaluateCheck,
  type FcrInput,
} from "./fcr";

// Step 3 acceptance list (docs/02-pondscale.md "Steps"):
// each of the 5 statuses · equal weights · current below start · feedKg 0
// rejected · FCR exactly 1.8 not too much · exactly 1.0 not check numbers ·
// ADG exactly at the minimum not slow · days < 7 note · weights above 5000
// rejected · negative margin · rounding of FCR and kobo.

const base: Omit<FcrInput, "species"> = {
  fishCount: 1000,
  days: 30,
  startG: 25,
  currentG: 60,
  feedKg: 55,
  feedPriceKobo: 120_000, // ₦1,200/kg
  fishPriceKobo: 250_000, // ₦2,500/kg
};

const run = (overrides: Partial<FcrInput> = {}) =>
  evaluateCheck({ species: "TILAPIA", ...base, ...overrides });

const ok = (overrides: Partial<FcrInput> = {}) => {
  const result = run(overrides);
  if (!result.ok) throw new Error(`expected success, got: ${result.error}`);
  return result;
};

describe("validation", () => {
  it("rejects feedKg of 0 with one plain sentence", () => {
    const result = run({ feedKg: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Enter the feed used as a number above 0 kg.");
      expect(result.error.split(". ").length).toBeGreaterThan(0); // readable sentence
    }
  });

  it.each([
    ["fishCount 0", { fishCount: 0 }, "Enter at least 1 fish."],
    ["days 0", { days: 0 }, "Enter at least 1 day."],
    ["startG 0", { startG: 0 }, "Enter a start weight above 0 g and at most 5000 g."],
    ["startG 5001", { startG: 5001 }, "Enter a start weight above 0 g and at most 5000 g."],
    [
      "currentG 5001",
      { currentG: 5001 },
      "Enter a current weight above 0 g and at most 5000 g.",
    ],
    ["currentG 0", { currentG: 0 }, "Enter a current weight above 0 g and at most 5000 g."],
    ["negative feed", { feedKg: -1 }, "Enter the feed used as a number above 0 kg."],
  ] as const)("rejects %s", (_label, overrides, message) => {
    const result = run(overrides as Partial<FcrInput>);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(message);
  });

  it("accepts weights of exactly 5000 g", () => {
    expect(ok({ startG: 4940, currentG: 5000, feedKg: 94 }).status).toBe("GOOD");
  });

  it("adds a note (not an error) for days under 7", () => {
    const short = ok({ days: 5 });
    expect(short.note).toBe(FCR_SHORT_NOTE);
    expect(short.ok).toBe(true);
    // Exactly 7 days: no note.
    expect(ok({ days: 7 }).note).toBeNull();
  });
});

describe("the five statuses, in decision order", () => {
  it("GOOD: feeding is right", () => {
    const r = ok();
    expect(r.status).toBe("GOOD");
    expect(r.message).toBe(FCR_MESSAGES.GOOD);
    expect(r.fcr).toBe(1.57);
    expect(r.adgGPerDay).toBe(1.17);
  });

  it("SLOW_GROWTH: FCR fine but ADG under the species minimum", () => {
    const r = ok({ feedKg: 30, currentG: 45 }); // gain 20 kg → FCR 1.50, ADG 0.67 < 1.0
    expect(r.status).toBe("SLOW_GROWTH");
    expect(r.message).toBe(FCR_MESSAGES.SLOW_GROWTH);
  });

  it("uses the species minimum: catfish needs ADG ≥ 2.0, tilapia ≥ 1.0", () => {
    // ADG = 1.2 g/day: slow for catfish, fine for tilapia.
    const inputs = { currentG: 61, feedKg: 55 }; // ADG = 36/30 = 1.2
    expect(ok({ ...inputs }).status).toBe("GOOD");
    expect(evaluateCheck({ ...base, ...inputs, species: "CATFISH" })).toMatchObject({
      ok: true,
      status: "SLOW_GROWTH",
    });
  });

  it("TOO_MUCH_FEED: FCR above the species fcrMax", () => {
    const r = ok({ feedKg: 40, currentG: 45 }); // FCR = 40/20 = 2.0 > 1.8
    expect(r.status).toBe("TOO_MUCH_FEED");
    expect(r.message).toBe(FCR_MESSAGES.TOO_MUCH_FEED);
  });

  it("CHECK_NUMBERS: FCR under 1.0 wins over the other rules", () => {
    const r = ok({ feedKg: 40, startG: 100, currentG: 160 }); // FCR = 40/60 = 0.67
    expect(r.status).toBe("CHECK_NUMBERS");
    expect(r.message).toBe(FCR_MESSAGES.CHECK_NUMBERS);
  });

  it("NO_GROWTH: current weight equal to start weight, no FCR computed", () => {
    const r = ok({ currentG: 25, feedKg: 35 });
    expect(r.status).toBe("NO_GROWTH");
    expect(r.message).toBe(FCR_MESSAGES.NO_GROWTH);
    expect(r.fcr).toBeNull();
    expect(r.gainKg).toBeNull();
    expect(r.adgGPerDay).toBeNull();
    expect(r.feedCostPerKgGainKobo).toBeNull();
    expect(r.marginPerKgKobo).toBeNull();
    // Stock value still works.
    expect(r.stockValueKobo).toBe(1000 * 0.025 * 250_000);
  });

  it("NO_GROWTH: current weight below start weight", () => {
    const r = ok({ currentG: 20, feedKg: 35 });
    expect(r.status).toBe("NO_GROWTH");
    expect(r.fcr).toBeNull();
  });
});

describe("exact boundaries", () => {
  it("FCR exactly 1.8 is NOT too much feed (still GOOD)", () => {
    // gainKg = 1000 × (60-25)/1000 = 35 → feedKg 63 gives exactly 1.8.
    const r = ok({ feedKg: 63 });
    expect(r.fcr).toBe(1.8);
    expect(r.status).toBe("GOOD");
  });

  it("FCR exactly 1.0 is NOT check numbers (still GOOD)", () => {
    // feedKg 35 gives exactly 1.0; ADG 1.167 ≥ 1.0.
    const r = ok({ feedKg: 35 });
    expect(r.fcr).toBe(1.0);
    expect(r.status).toBe("GOOD");
  });

  it("ADG exactly at the species minimum is NOT slow", () => {
    // ADG = (30-0... ) 30 g over 30 days = exactly 1.0 for tilapia.
    const r = ok({ startG: 30, currentG: 60, feedKg: 63 }); // gain 30 kg, FCR 2.1 → too much
    expect(r.adgGPerDay).toBe(1.0);
    // FCR 2.1 > 1.8 would hide the ADG check, so use feed that keeps FCR in range:
    const slow = ok({ startG: 30, currentG: 60, feedKg: 54 }); // FCR 1.8, ADG 1.0
    expect(slow.fcr).toBe(1.8);
    expect(slow.adgGPerDay).toBe(1.0);
    expect(slow.status).toBe("GOOD");
    expect(r.status).toBe("TOO_MUCH_FEED"); // sanity: high feed trips first
  });
});

describe("money in integer kobo", () => {
  it("negative margin gives the warning sentence", () => {
    // Fish ₦2,500/kg; feed cost = 1.5 × ₦1,200 = ₦1,800 → positive.
    const positive = ok({ feedKg: 30, currentG: 45 }); // FCR 1.5 → ₦1,800 cost
    expect(positive.marginPerKgKobo).toBe(250_000 - 180_000);
    expect(positive.marginMessage).toBeNull();

    // Expensive feed: ₦3,000/kg with FCR 1.5 → cost ₦4,500 > fish ₦2,500.
    const negative = ok({ feedKg: 30, currentG: 45, feedPriceKobo: 300_000 });
    expect(negative.marginPerKgKobo).toBe(250_000 - 450_000);
    expect(negative.marginMessage).toBe(NEGATIVE_MARGIN_MESSAGE);
    // The hint never changes the status itself.
    expect(negative.status).toBe("SLOW_GROWTH");
  });

  it("rounds FCR to 2 decimals and all kobo values to whole kobo", () => {
    const r = ok({ feedKg: 58 }); // 58/35 = 1.657142… → 1.66
    expect(r.fcr).toBe(1.66);
    expect(Number.isInteger(r.feedCostPerKgGainKobo)).toBe(true);
    expect(r.feedCostPerKgGainKobo).toBe(Math.round(1.66 * 120_000)); // 199200
    expect(Number.isInteger(r.stockValueKobo)).toBe(true);
    expect(r.stockValueKobo).toBe(1000 * 0.06 * 250_000);

    // Half-kobo case rounds to the nearest integer kobo:
    // FCR 1.5 × ₦1,200.05/kg = ₦1,800.075 → 180008.
    const odd = ok({ feedKg: 30, currentG: 45, feedPriceKobo: 120_005 }); // FCR 1.5 → 180007.5
    expect(odd.feedCostPerKgGainKobo).toBe(180_008); // .5 rounds up
    expect(Number.isInteger(odd.feedCostPerKgGainKobo)).toBe(true);
  });

  it("stock value uses fish count × current weight in kg × fish price", () => {
    const r = ok({ fishCount: 200, startG: 50, currentG: 110, feedKg: 30, fishPriceKobo: 280_000 });
    expect(r.stockValueKobo).toBe(200 * 0.11 * 280_000); // 6,160,000
  });
});