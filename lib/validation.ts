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

/// The five numbers of the check wizard (docs/02-pondscale.md step 4B).
/// Weights are whole grams (the Check table stores Int grams); feed is
/// kilograms and may be fractional. Every message is one sentence saying
/// what to fix, shown next to the field (design.md §6).
export const checkNumbersSchema = z.object({
  fishCount: z.coerce
    .number({ invalid_type_error: "Enter the number of fish in the pond." })
    .int("Enter the fish count as a whole number.")
    .min(1, "Enter at least 1 fish.")
    .max(100_000_000, "That fish count looks wrong — check the number."),
  days: z.coerce
    .number({ invalid_type_error: "Enter the number of days." })
    .int("Enter the days as a whole number.")
    .min(1, "Enter at least 1 day.")
    .max(3650, "Keep the check window under 10 years (3650 days)."),
  startG: z.coerce
    .number({ invalid_type_error: "Enter the weight at the start." })
    .int("Enter the start weight as a whole number of grams.")
    .min(1, "Enter a start weight of at least 1 g.")
    .max(5000, "Keep the start weight at or below 5000 g."),
  currentG: z.coerce
    .number({ invalid_type_error: "Enter the weight now." })
    .int("Enter the weight now as a whole number of grams.")
    .min(1, "Enter a weight now of at least 1 g.")
    .max(5000, "Keep the weight now at or below 5000 g."),
  feedKg: z.coerce
    .number({ invalid_type_error: "Enter the feed used." })
    .positive("Enter the feed used as a number above 0 kg.")
    .max(1_000_000, "Keep the feed used under 1,000,000 kg."),
});

export type CheckNumbers = z.infer<typeof checkNumbersSchema>;

/** One sentence per field, for the wizard to render next to the input. */
export function fieldErrors(error: z.ZodError): Partial<Record<keyof CheckNumbers, string>> {
  const out: Partial<Record<keyof CheckNumbers, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof CheckNumbers;
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Naira (may be fractional) → integer kobo (₦1 = 100 kobo). */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}
