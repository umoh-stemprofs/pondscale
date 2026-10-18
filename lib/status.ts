import type { CheckStatus } from "@prisma/client";

// Status presentation (design.md §1: status is never colour alone — always
// colour + icon + word). Pure, shared by server pages and client cards.

export interface StatusMeta {
  label: string;
  icon: string;
  cls: string;
}

export const STATUS_META: Record<CheckStatus, StatusMeta> = {
  GOOD: { label: "Good", icon: "✓", cls: "bg-success-bg text-success" },
  SLOW_GROWTH: { label: "Slow growth", icon: "!", cls: "bg-warning-bg text-warning" },
  TOO_MUCH_FEED: { label: "Too much feed", icon: "!", cls: "bg-warning-bg text-warning" },
  CHECK_NUMBERS: { label: "Check numbers", icon: "×", cls: "bg-danger-bg text-danger" },
  NO_GROWTH: { label: "No growth", icon: "×", cls: "bg-danger-bg text-danger" },
};
