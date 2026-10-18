import { Species } from "@prisma/client";
import { z } from "zod";

// Zod schemas for the step-4A forms. Every server input is validated here
// (docs/00-global.md §2: never trust the client); each failure message is one
// plain sentence saying what to fix (docs/00-global.md §6).

export const DB_BUSY_ERROR = "Cannot reach the database right now — try again in a moment.";

export const pondNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a pond name.")
    .max(40, "Keep the pond name under 40 characters."),
});

export const pondSchema = pondNameSchema.extend({
  species: z.nativeEnum(Species, {
    errorMap: () => ({ message: "Choose tilapia or catfish." }),
  }),
});

/// Latitude −90..90, longitude −180..180, feed price as naira per kg
/// (stored as integer kobo, docs/00-global.md §2 and §3).
export const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter the farm name.")
    .max(60, "Keep the farm name under 60 characters."),
  lat: z
    .string()
    .trim()
    .min(1, "Enter the latitude.")
    .pipe(
      z.coerce
        .number({ invalid_type_error: "Latitude must be a number." })
        .min(-90, "Latitude must be between −90 and 90.")
        .max(90, "Latitude must be between −90 and 90."),
    ),
  lon: z
    .string()
    .trim()
    .min(1, "Enter the longitude.")
    .pipe(
      z.coerce
        .number({ invalid_type_error: "Longitude must be a number." })
        .min(-180, "Longitude must be between −180 and 180.")
        .max(180, "Longitude must be between −180 and 180."),
    ),
  feedPriceNaira: z
    .string()
    .trim()
    .min(1, "Enter the feed price per kg.")
    .pipe(
      z.coerce
        .number({ invalid_type_error: "Feed price must be a number." })
        .positive("Enter a feed price above ₦0.")
        .max(1_000_000, "Keep the feed price under ₦1,000,000 per kg."),
    ),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

/** Naira (may be fractional) → integer kobo (₦1 = 100 kobo). */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}
