"use client";

// Growth line chart (docs/02-pondscale.md step 5): ADG in g per fish per
// day with the species minimum as a reference line. Values may be negative
// (a pond can lose weight), and the table shows the same numbers.

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
import type { GrowthPoint } from "@/lib/charts/series";
import { fmtDay, fmtDayShort } from "@/lib/format";
import { AXIS_TICK, GRID_STROKE, MUTED_COLOR, SERIES_AMBER, THRESHOLD_COLOR, TOOLTIP_STYLE } from "./theme";

export function GrowthLineChart({ points, adgMin }: { points: GrowthPoint[]; adgMin: number }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={points} margin={{ top: 8, right: 110, bottom: 4, left: -4 }}>
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
          width={44}
          label={{
            value: "g/day",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 12, fill: MUTED_COLOR },
          }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(iso) => fmtDay(String(iso))}
          formatter={(value) => [`${Number(value).toFixed(2)} g per fish per day`, "Growth"]}
        />
        <ReferenceLine y={0} stroke={GRID_STROKE} />
        <ReferenceLine
          y={adgMin}
          stroke={THRESHOLD_COLOR}
          strokeDasharray="4 4"
          label={{
            value: `Min ${adgMin} g/day`,
            position: "insideTopRight",
            fill: THRESHOLD_COLOR,
            fontSize: 12,
          }}
        />
        <Line
          dataKey="adgGPerDay"
          stroke={SERIES_AMBER}
          strokeWidth={2}
          dot={{ r: 2.5, fill: SERIES_AMBER }}
          activeDot={{ r: 4 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
