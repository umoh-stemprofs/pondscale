"use client";

// FCR line chart (docs/02-pondscale.md step 5): one line per saved check
// with the species limit and the FCR = 1.0 reference. NO_GROWTH checks have
// no FCR, so the line GAPS there — never an invented point (design.md §4).

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FcrPoint } from "@/lib/charts/series";
import { fmtDay, fmtDayShort } from "@/lib/format";
import { AXIS_TICK, GRID_STROKE, MUTED_COLOR, SERIES_BLUE, THRESHOLD_COLOR, TOOLTIP_STYLE } from "./theme";

export function FcrLineChart({ points, fcrMax }: { points: FcrPoint[]; fcrMax: number }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={points} margin={{ top: 8, right: 96, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickFormatter={(iso) => fmtDayShort(String(iso))}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          minTickGap={28}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          label={{
            value: "FCR",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 12, fill: MUTED_COLOR },
          }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(iso) => fmtDay(String(iso))}
          formatter={(value) =>
            value === null || value === undefined || Number.isNaN(Number(value))
              ? ["No growth — no FCR", "FCR"]
              : [`FCR ${Number(value).toFixed(2)}`, "FCR"]
          }
        />
        <ReferenceLine
          y={fcrMax}
          stroke={THRESHOLD_COLOR}
          strokeDasharray="4 4"
          label={{
            value: `Limit ${fcrMax}`,
            position: "insideTopRight",
            fill: THRESHOLD_COLOR,
            fontSize: 12,
          }}
        />
        <ReferenceLine
          y={1}
          stroke={MUTED_COLOR}
          strokeDasharray="2 4"
          label={{ value: "1.0", position: "insideBottomRight", fill: MUTED_COLOR, fontSize: 12 }}
        />
        <Line
          dataKey="fcr"
          stroke={SERIES_BLUE}
          strokeWidth={2}
          dot={{ r: 2.5, fill: SERIES_BLUE }}
          activeDot={{ r: 4 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
