import type { BadgeState } from "./DataSourceBadge";
import { DataSourceBadge } from "./DataSourceBadge";
import { cropLabel, fmtDay, naira } from "@/lib/format";
import type { PriceCardData } from "@/lib/market/view";

// Fish price cards (kept from step 2, still showing their data-source badge).
// Fetching lives in lib/market/view.ts so the dashboard can reuse the same
// quotes for the estimated market value.

function quoteBadge(card: PriceCardData): BadgeState {
  return card.quote.source === "LIVE" ? { kind: "live", ageMinutes: 0 } : { kind: "simulated" };
}

export function FishPriceCards({
  cards,
  variant = "feature",
}: {
  cards: PriceCardData[];
  /// "feature": the two fish cards. "compact": the wider grid of other
  /// crops on the market page — same numbers, same badge, smaller type.
  variant?: "feature" | "compact";
}) {
  if (cards.length === 0) {
    return <p className="text-muted">Prices are unavailable right now.</p>;
  }
  const unit = (value: string) => (value === "KG" ? "kg" : value.toLowerCase());
  const compact = variant === "compact";
  return (
    <div
      className={
        compact ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-4 sm:grid-cols-2"
      }
    >
      {cards.map((card) => (
        <div
          key={card.crop}
          className={`rounded-card border border-border bg-surface shadow-card ${compact ? "p-3" : "p-4"}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-muted">{cropLabel(card.crop)}</p>
            <DataSourceBadge state={quoteBadge(card)} />
          </div>
          <p className={`mt-1 font-bold tabular-nums ${compact ? "text-xl" : "text-2xl"}`}>
            {naira(card.quote.priceKobo)}/{unit(card.quote.unit)}
          </p>
          <p className="text-sm text-muted">
            {card.changePct === null
              ? `as of ${fmtDay(card.quote.date)}`
              : `${card.changePct > 0 ? "↑" : card.changePct < 0 ? "↓" : "→"} ${
                  card.changePct > 0 ? "+" : ""
                }${card.changePct}% vs yesterday · as of ${fmtDay(card.quote.date)}`}
          </p>
        </div>
      ))}
    </div>
  );
}
