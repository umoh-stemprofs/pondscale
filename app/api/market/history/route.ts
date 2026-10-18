import { NextResponse } from "next/server";
import { historyQuerySchema } from "@/lib/market/query";
import { getMarketProvider } from "@/lib/market/provider";

export const dynamic = "force-dynamic";

/// GET /api/market/history?crop=MAIZE&days=30 — daily prices for one crop,
/// 1–90 days (docs/00-global.md §3). Bad input gets one sentence saying what
/// to fix, never a crash.
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = historyQuerySchema.safeParse({
    crop: url.searchParams.get("crop") ?? undefined,
    days: url.searchParams.get("days") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Pick a crop from the catalog and days between 1 and 90." },
      { status: 400 },
    );
  }

  const quotes = await getMarketProvider().getHistory(parsed.data.crop, parsed.data.days);
  return NextResponse.json(quotes);
}