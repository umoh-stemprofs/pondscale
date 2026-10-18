import { describe, expect, it } from "vitest";
import { todayIso } from "../dates";
import { LiveProvider, SimulatedProvider, type MarketQuote } from "./provider";
import { historyQuerySchema } from "./query";

const today = todayIso();

describe("SimulatedProvider", () => {
  it("returns one simulated quote per catalog crop for today", async () => {
    const quotes = await new SimulatedProvider().getPrices(today);
    expect(quotes).toHaveLength(9);
    for (const quote of quotes) {
      expect(quote.date).toBe(today);
      expect(quote.source).toBe("SIMULATED");
      expect(quote.priceKobo).toBeGreaterThan(0);
    }
    expect(quotes.some((q) => q.crop === "TILAPIA")).toBe(true);
    expect(quotes.some((q) => q.crop === "CATFISH")).toBe(true);
  });

  it("returns history in ascending date order", async () => {
    const history = await new SimulatedProvider().getHistory("MAIZE", 7, today);
    expect(history).toHaveLength(7);
    expect(history[0].date < history[6].date).toBe(true);
    expect(history[6].date).toBe(today);
  });
});

describe("LiveProvider", () => {
  const fixture: MarketQuote[] = [
    { crop: "TILAPIA", date: today, priceKobo: 123456, unit: "KG", source: "LIVE" },
  ];

  it("uses the live payload when the API answers correctly", async () => {
    const okFetch = (async () =>
      new Response(JSON.stringify(fixture), { status: 200 })) as unknown as typeof fetch;
    const prices = await new LiveProvider("https://market.example", undefined, okFetch).getPrices(today);
    expect(prices).toEqual(fixture);
  });

  it("falls back to the simulated feed when fetch fails", async () => {
    const failingFetch = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const prices = await new LiveProvider(
      "https://market.example",
      new SimulatedProvider(),
      failingFetch,
    ).getPrices(today);
    expect(prices).toHaveLength(9);
    expect(prices.every((q) => q.source === "SIMULATED")).toBe(true);
  });

  it("falls back to the simulated feed when the payload shape is wrong", async () => {
    const weirdFetch = (async () =>
      new Response(JSON.stringify({ nope: true }), { status: 200 })) as unknown as typeof fetch;
    const prices = await new LiveProvider(
      "https://market.example",
      new SimulatedProvider(),
      weirdFetch,
    ).getPrices(today);
    expect(prices).toHaveLength(9);
    expect(prices.every((q) => q.source === "SIMULATED")).toBe(true);
  });

  it("falls back on a non-2xx status too", async () => {
    const errorFetch = (async () =>
      new Response("nope", { status: 503 })) as unknown as typeof fetch;
    const prices = await new LiveProvider(
      "https://market.example",
      new SimulatedProvider(),
      errorFetch,
    ).getHistory("MAIZE", 3, today);
    expect(prices).toHaveLength(3);
    expect(prices.every((q) => q.source === "SIMULATED")).toBe(true);
  });
});

describe("history query validation", () => {
  it("accepts a catalog crop and coerces days", () => {
    const parsed = historyQuerySchema.parse({ crop: "MAIZE", days: "30" });
    expect(parsed.days).toBe(30);
  });

  it("defaults days to 30", () => {
    const parsed = historyQuerySchema.parse({ crop: "YAM" });
    expect(parsed.days).toBe(30);
  });

  it("rejects days above 90, days below 1 and unknown crops", () => {
    expect(historyQuerySchema.safeParse({ crop: "MAIZE", days: "91" }).success).toBe(false);
    expect(historyQuerySchema.safeParse({ crop: "MAIZE", days: "0" }).success).toBe(false);
    expect(historyQuerySchema.safeParse({ crop: "GRASS", days: "30" }).success).toBe(false);
  });
});