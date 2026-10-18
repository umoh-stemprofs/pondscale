// Data-source badge (design.md §2) — required by the Agriculture rules:
// every data block must say whether it is Live, Saved data or Simulated.
// Status is never colour alone: colour + icon + word.

export type BadgeState =
  | { kind: "live"; ageMinutes: number }
  | { kind: "saved"; ageMinutes: number }
  | { kind: "simulated" };

/** "just now" · "12 min ago" · "3 h old" · "2 days old". */
export function formatAge(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours)} h old`;
  return `${Math.round(hours / 24)} days old`;
}

export function DataSourceBadge({ state }: { state: BadgeState }) {
  if (state.kind === "simulated") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-0.5 text-sm font-medium text-info">
        <span aria-hidden="true">⚗</span> Simulated
      </span>
    );
  }
  if (state.kind === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-sm font-medium text-success">
        <span aria-hidden="true">●</span> Live · updated {formatAge(state.ageMinutes)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-0.5 text-sm font-medium text-warning">
      <span aria-hidden="true">⧗</span> Saved data · {formatAge(state.ageMinutes)}
    </span>
  );
}