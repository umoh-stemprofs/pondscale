import { NextResponse } from "next/server";
import { getMarketProvider } from "@/lib/market/provider";
import { cacheQuotes } from "@/lib/market/store";

export const dynamic = "force-dynamic";

/// GET /api/market/prices — latest price of every crop in the catalog.
/// Returns [{crop, date, priceKobo, unit, source}] (docs/00-global.md §3).
export async function GET(): Promise<NextResponse> {
  const quotes = await getMarketProvider().getPrices();
  await cacheQuotes(quotes);
  return NextResponse.json(quotes);
}