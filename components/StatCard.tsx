// Stat card (design.md §2): label, big number, small supporting line.
// Server-safe — no hooks, no client boundary.

import type { BadgeState } from "./DataSourceBadge";
import { DataSourceBadge } from "./DataSourceBadge";

interface StatCardProps {
  label: string;
  value: string;
  sub?: React.ReactNode;
  badge?: BadgeState;
  className?: string;
}

export function StatCard({ label, value, sub, badge, className = "" }: StatCardProps) {
  return (
    <div className={`rounded-card border border-border bg-surface p-4 shadow-card ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {badge ? <DataSourceBadge state={badge} /> : null}
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums sm:text-[28px]">{value}</p>
      {sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}
    </div>
  );
}
