import { Crop } from "@prisma/client";
import { z } from "zod";
import { MARKET_HISTORY_MAX_DAYS } from "../config";

/// Query validation for GET /api/market/history (Zod on every server input,
/// docs/00-global.md §2). `days` arrives as a string and is coerced.
export const historyQuerySchema = z.object({
  crop: z.nativeEnum(Crop),
  days: z.coerce
    .number({ invalid_type_error: "days must be a number" })
    .int()
    .min(1)
    .max(MARKET_HISTORY_MAX_DAYS)
    .default(30),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;

/// The market page's chart toggle offers exactly 7 / 30 / 90 days; anything
/// else in the URL falls back to 30 (Zod on every server input).
export const marketDaysSchema = z.object({
  days: z.coerce
    .number({ invalid_type_error: "days must be a number" })
    .int()
    .refine((value) => value === 7 || value === 30 || value === 90, {
      message: "Choose 7, 30 or 90 days.",
    })
    .default(30),
});