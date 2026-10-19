"use client";

// Chart card (design.md §2 Chart card + step 5): title, data-source badge,
// the chart, "View as table" with the SAME numbers the chart draws, an empty
// state (icon, one sentence, one button) and a loading skeleton for the
// Suspense fallback. The card itself does not depend on Recharts, so pages
// can stream it while the chart data loads.

import { useState, type ReactNode } from "react";
import type { BadgeState } from "../DataSourceBadge";
import { DataSourceBadge } from "../DataSourceBadge";
import { TrendIcon } from "../icons";

export interface TableData {
  head: string[];
  rows: (string | number)[][];
}

export interface ChartEmpty {
  sentence: string;
  buttonLabel: string;
  buttonHref: string;
}

interface ChartCardProps {
  title: string;
  badge?: BadgeState;
  /// The same numbers the chart draws — shown by "View as table".
  table: TableData;
  /// When `table.rows` is empty, the card shows this state instead.
  empty: ChartEmpty;
  children: ReactNode;
}

export function ChartCard({ title, badge, table, empty, children }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  const isEmpty = table.rows.length === 0;

  return (
    <section
      aria-label={title}
      className="flex flex-col rounded-card border border-border bg-surface p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {badge ? <DataSourceBadge state={badge} /> : null}
      </div>

      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <TrendIcon className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">{empty.sentence}</p>
          <a
            href={empty.buttonHref}
            className="flex h-11 items-center rounded-input bg-accent px-4 font-medium text-white"
          >
            {empty.buttonLabel}
          </a>
        </div>
      ) : (
        <>
          <div className="mt-3 flex-1">
            {showTable ? (
              <div className="max-h-[240px] overflow-auto">
                <table className="w-full text-left text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      {table.head.map((column) => (
                        <th key={column} scope="col" className="py-2 pr-3 font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, index) => (
                      <tr key={index} className="border-b border-border/60">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="py-2 pr-3">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              children
            )}
          </div>
          <button
            type="button"
            aria-pressed={showTable}
            onClick={() => setShowTable((value) => !value)}
            className="mt-3 self-start text-sm font-medium text-accent hover:underline"
          >
            {showTable ? "View as chart" : "View as table"}
          </button>
        </>
      )}
    </section>
  );
}

/// Loading skeleton for a chart card (design.md §2 skeleton loader). Used as
/// the Suspense fallback while a chart's data is still being fetched.
export function ChartSkeleton() {
  return (
    <div role="status" aria-label="Loading chart" className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="h-5 w-40 animate-pulse rounded bg-border" />
      <div className="mt-4 h-[240px] animate-pulse rounded-input bg-bg" />
      <div className="mt-3 h-4 w-28 animate-pulse rounded bg-bg" />
      <span className="sr-only">Loading chart…</span>
    </div>
  );
}
