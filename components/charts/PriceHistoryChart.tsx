"use client";

// Market price line chart (step 5): tilapia and catfish over 7 / 30 / 90
// days, two color-blind safe series with a legend, ₦ per kg on the axis,
// and the same quotes in the "View as table" list.

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDay, fmtDayShort, naira } from "@/lib/format";
import type { PricePoint } from "./tables";
import { AXIS_TICK, GRID_STROKE, SERIES_AMBER, SERIES_BLUE, TOOLTIP_STYLE } from "./theme";

export function PriceHistoryChart({ points }: { points: PricePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
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
          width={64}
          tickFormatter={(value) => naira(Number(value))}
          label={{
            value: "₦ per kg",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 12, fill: "#475467" },
          }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(iso) => fmtDay(String(iso))}
          formatter={(value, name) => [naira(Number(value)), String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          dataKey="tilapiaKobo"
          name="Tilapia"
          stroke={SERIES_BLUE}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        <Line
          dataKey="catfishKobo"
          name="Catfish"
          stroke={SERIES_AMBER}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
