"use client";

// "Stock value by pond" bar chart (dashboard, step 5): horizontal bars so
// long pond names stay readable at 390 px, sorted biggest first via the
// same helper the "View as table" list uses.

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { valueByPond, type ValueSlice } from "@/lib/charts/series";
import { naira } from "@/lib/format";
import { AXIS_TICK, GRID_STROKE, SERIES_BLUE, TOOLTIP_STYLE } from "./theme";

export function StockValueBar({ rows }: { rows: ValueSlice[] }) {
  const data = valueByPond(rows);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => naira(Number(value))}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={96}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [naira(Number(value)), "Stock value"]}
        />
        <Bar
          dataKey="valueKobo"
          name="Stock value"
          fill={SERIES_BLUE}
          radius={[0, 4, 4, 0]}
          barSize={18}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
