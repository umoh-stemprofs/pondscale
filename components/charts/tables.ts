// "View as table" builders for the chart cards. This module is deliberately
// NOT a client component: server pages call these while rendering, and a
// plain function exported from a "use client" module is only a client
// reference on the server ("valueTableData is not a function" — caught in
// the step-5 click-through). Each builder reads the same series helpers the
// chart draws from, so the table can never disagree with the picture.

import type { FcrPoint, GrowthPoint, ValueSlice } from "@/lib/charts/series";
import { fmtDay, fmtFcr, naira } from "@/lib/format";
import { groupTopSlices, valueByPond } from "@/lib/charts/series";
import type { TableData } from "./ChartCard";

export function fcrTableData(points: FcrPoint[]): TableData {
  return {
    head: ["Date", "FCR"],
    rows: points.map((point) => [fmtDay(point.date), fmtFcr(point.fcr)]),
  };
}

export function growthTableData(points: GrowthPoint[]): TableData {
  return {
    head: ["Date", "Growth (g per fish per day)"],
    rows: points.map((point) => [fmtDay(point.date), `${point.adgGPerDay.toFixed(2)} g`]),
  };
}

export function valueTableData(rows: ValueSlice[]): TableData {
  return {
    head: ["Pond", "Stock value"],
    rows: valueByPond(rows).map((row) => [row.name, naira(row.valueKobo)]),
  };
}

export function shareTableData(rows: ValueSlice[]): TableData {
  const slices = groupTopSlices(rows);
  const total = slices.reduce((sum, slice) => sum + slice.valueKobo, 0);
  return {
    head: ["Pond", "Stock value", "Share"],
    rows: slices.map((slice) => [
      slice.name,
      naira(slice.valueKobo),
      total > 0 ? `${Math.round((slice.valueKobo / total) * 100)}%` : "—",
    ]),
  };
}

export function compareTableData(fcr: number | null, fcrMax: number): TableData {
  if (fcr === null) return { head: ["", "FCR"], rows: [] };
  return {
    head: ["", "FCR"],
    rows: [
      ["This check", fmtFcr(fcr)],
      ["Species limit", fmtFcr(fcrMax)],
    ],
  };
}

/// One row of the market chart: both fish priced on the same calendar day.
export interface PricePoint {
  date: string; // YYYY-MM-DD
  tilapiaKobo: number;
  catfishKobo: number;
}

export function priceTableData(points: PricePoint[]): TableData {
  return {
    head: ["Date", "Tilapia", "Catfish"],
    rows: points.map((point) => [
      fmtDay(point.date),
      naira(point.tilapiaKobo),
      naira(point.catfishKobo),
    ]),
  };
}
