"use client";

// "Share of stock value" pie (dashboard, step 5): at most 5 slices — the
// design rule — with everything beyond the biggest four merged into "Other"
// by groupTopSlices, which the table uses too.

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { groupTopSlices, type ValueSlice } from "@/lib/charts/series";
import { naira } from "@/lib/format";
import { PALETTE, TOOLTIP_STYLE } from "./theme";

export function StockValuePie({ rows }: { rows: ValueSlice[] }) {
  const slices = groupTopSlices(rows);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="valueKobo"
          nameKey="name"
          innerRadius={54}
          outerRadius={84}
          paddingAngle={1}
          isAnimationActive={false}
        >
          {slices.map((slice, index) => (
            <Cell key={slice.name} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => [naira(Number(value)), String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
