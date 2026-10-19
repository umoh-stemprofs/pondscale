"use server";

import { Crop, type Species } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { firstIssue, type FormState } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayIso } from "@/lib/dates";
import { getOrCreateFarm } from "@/lib/guards";
import { loadPriceCards } from "@/lib/market/view";
import { getSession } from "@/lib/session";
import { checkNumbersSchema, DB_BUSY_ERROR } from "@/lib/validation";
import { deleteCheckForFarm, saveCheckForFarm } from "@/lib/check/service";

// Check server actions (docs/02-pondscale.md step 4B). Each action re-checks
// the session itself — middleware is only the first gate — and the service
// re-checks that the pond belongs to this user's farm, then recomputes every
// stored number from the typed inputs (docs/00-global.md §2, §3).

const readString = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

/// Latest market price (kobo per kg) for a species, from the same feed the
/// market screen shows. loadPriceCards never throws; null means no price.
async function marketFishPrice(species: Species): Promise<number | null> {
  const crop = species === "TILAPIA" ? Crop.TILAPIA : Crop.CATFISH;
  const cards = await loadPriceCards([crop]);
  return cards[0]?.quote.priceKobo ?? null;
}

export async function saveCheck(_prev: FormState, formData: FormData): Promise<FormState> {
  // Validate the shape first, so a bad number never reaches the database.
  const parsed = checkNumbersSchema.safeParse({
    fishCount: readString(formData, "fishCount"),
    days: readString(formData, "days"),
    startG: readString(formData, "startG"),
    currentG: readString(formData, "currentG"),
    feedKg: readString(formData, "feedKg"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const session = await getSession();
  if (!session.userId) return { error: "Your session ended — log in again." };

  try {
    const farm = await getOrCreateFarm(session.userId);
    const result = await saveCheckForFarm(db, {
      farmId: farm.id,
      pondId: readString(formData, "pondId"),
      // Only the five typed numbers are read; anything else the browser sent
      // (fcr, status, stock value…) is ignored and recomputed on the server.
      numbers: parsed.data,
      date: new Date(`${todayIso()}T00:00:00.000Z`),
      fishPriceFor: marketFishPrice,
    });
    if (!result.ok) return { error: result.error };
  } catch {
    return { error: DB_BUSY_ERROR };
  }

  revalidatePath("/");
  revalidatePath("/ponds");
  revalidatePath("/check");
  revalidatePath("/check/history");
  return { saved: true };
}

export async function deleteCheck(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session.userId) return { error: "Your session ended — log in again." };

  try {
    const farm = await getOrCreateFarm(session.userId);
    const result = await deleteCheckForFarm(db, readString(formData, "checkId"), farm.id);
    if (!result.ok) return { error: result.error };
  } catch {
    return { error: DB_BUSY_ERROR };
  }

  revalidatePath("/");
  revalidatePath("/ponds");
  revalidatePath("/check/history");
  return { saved: true };
}
