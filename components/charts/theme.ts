// Shared Recharts presentation (docs/design.md §4): color-blind safe series
// colours, light gridlines, axis text at least 12 px, units on axes.

/// Color-blind safe palette, in the design's order.
export const PALETTE = ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#CC79A7", "#56B4E9"] as const;

export const SERIES_BLUE = PALETTE[0];
export const SERIES_AMBER = PALETTE[1];

/// Sample thresholds are drawn in the warning colour (design.md §1).
export const THRESHOLD_COLOR = "#B54708";
/// The FCR = 1.0 reference is plain muted text (design.md §1).
export const MUTED_COLOR = "#475467";

export const GRID_STROKE = "#E4E7EC";

/// Axis text: 12 px minimum (docs/design.md §4).
export const AXIS_TICK = { fontSize: 12, fill: MUTED_COLOR } as const;

export const TOOLTIP_STYLE: React.CSSProperties = {
  fontSize: 13,
  borderRadius: 8,
  border: "1px solid #E4E7EC",
  boxShadow: "0 1px 2px rgba(16,24,40,.06)",
  color: "#101828",
};
