import { Crop, PriceSource, Unit } from "@prisma/client";
import { z } from "zod";
import { MARKET_HISTORY_MAX_DAYS } from "../config";
import { todayIso } from "../dates";
import { CATALOG, catalogEntry, type CropConfig } from "./catalog";
import { priceHistory, priceOnDate } from "./generator";

// MarketProvider adapter (docs/00-global.md §3): SimulatedProvider is the
// default; if MARKET_API_URL is set, LiveProvider fetches it and falls back
// to the simulated feed on any failure. The quote's `source` always tells
// the truth, so the UI badge never lies.

export interface MarketQuote {
  crop: Crop;
  date: string; // "YYYY-MM-DD"
  priceKobo: number;
  unit: Unit;
  source: PriceSource;
}

export interface MarketProvider {
  getPrices(endDateIso?: string): Promise<MarketQuote[]>;
  getHistory(crop: Crop, days: number, endDateIso?: string): Promise<MarketQuote[]>;
}

/// Shape of a quote from a live market API — validated before it is trusted.
export const marketQuoteSchema = z.object({
  crop: z.nativeEnum(Crop),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  priceKobo: z.number().int().positive(),
  unit: z.nativeEnum(Unit),
  source: z.nativeEnum(PriceSource),
});
export const marketQuoteArraySchema = z.array(marketQuoteSchema).min(1);

export class SimulatedProvider implements MarketProvider {
  async getPrices(endDateIso: string = todayIso()): Promise<MarketQuote[]> {
    return CATALOG.map((cfg) => quoteOf(cfg, endDateIso));
  }

  async getHistory(
    crop: Crop,
    days: number,
    endDateIso: string = todayIso(),
  ): Promise<MarketQuote[]> {
    return historyQuotes(crop, days, endDateIso);
  }
}

export class LiveProvider implements MarketProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly fallback: MarketProvider = new SimulatedProvider(),
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async getPrices(endDateIso: string = todayIso()): Promise<MarketQuote[]> {
    try {
      return await this.fetchQuotes(`/prices?date=${endDateIso}`);
    } catch {
      return this.fallback.getPrices(endDateIso);
    }
  }

  async getHistory(
    crop: Crop,
    days: number,
    endDateIso: string = todayIso(),
  ): Promise<MarketQuote[]> {
    try {
      const clamped = Math.min(Math.max(days, 1), MARKET_HISTORY_MAX_DAYS);
      return await this.fetchQuotes(`/history?crop=${crop}&days=${clamped}&date=${endDateIso}`);
    } catch {
      return this.fallback.getHistory(crop, days, endDateIso);
    }
  }

  /// Any network error, non-2xx status or unexpected shape throws and the
  /// caller falls back to the simulated feed (source stays SIMULATED).
  private async fetchQuotes(path: string): Promise<MarketQuote[]> {
    const response = await this.fetchFn(`${this.baseUrl.replace(/\/$/, "")}${path}`);
    if (!response.ok) {
      throw new Error(`Market API responded with ${response.status}`);
    }
    return marketQuoteArraySchema.parse(await response.json());
  }
}

/** Default provider: live when MARKET_API_URL is set, simulated otherwise. */
export function getMarketProvider(fetchFn?: typeof fetch): MarketProvider {
  const baseUrl = process.env.MARKET_API_URL?.trim();
  if (baseUrl) {
    return new LiveProvider(baseUrl, new SimulatedProvider(), fetchFn ?? fetch);
  }
  return new SimulatedProvider();
}

function quoteOf(cfg: CropConfig, date: string): MarketQuote {
  return {
    crop: cfg.crop,
    date,
    priceKobo: priceOnDate(cfg, date),
    unit: cfg.unit,
    source: "SIMULATED",
  };
}

function historyQuotes(crop: Crop, days: number, endDateIso: string): MarketQuote[] {
  const cfg = catalogEntry(crop);
  return priceHistory(cfg, endDateIso, days).map((point) => ({
    crop,
    date: point.date,
    priceKobo: point.priceKobo,
    unit: cfg.unit,
    source: "SIMULATED",
  }));
}