"use client";

// Small bar comparing this check's FCR against the species limit
// (docs/02-pondscale.md step 5, result page). No FCR (NO_GROWTH) means no
// bars: the table has no rows, so ChartCard shows its empty state instead.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, GRID_STROKE, MUTED_COLOR, SERIES_AMBER, SERIES_BLUE, TOOLTIP_STYLE } from "./theme";

export function FcrCompareBar({ fcr, fcrMax }: { fcr: number; fcrMax: number }) {
  const data = [
    { name: "This check", value: fcr },
    { name: "Species limit", value: fcrMax },
  ];
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 56, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          label={{
            value: "FCR",
            position: "insideBottom",
            offset: -2,
            style: { fontSize: 12, fill: MUTED_COLOR },
          }}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={104}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`FCR ${Number(value).toFixed(2)}`, "FCR"]}
        />
        <Bar
          dataKey="value"
          name="FCR"
          barSize={22}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
          label={{ position: "right", fontSize: 12, fill: MUTED_COLOR }}
        >
          <Cell fill={SERIES_BLUE} />
          <Cell fill={SERIES_AMBER} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
