"use server";

import { revalidatePath } from "next/cache";
import { firstIssue, type FormState } from "@/lib/auth";
import { DB_BUSY_ERROR, nairaToKobo, settingsSchema } from "@/lib/validation";
import { getOrCreateFarm } from "@/lib/guards";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// Farm settings action (docs/02-pondscale.md step 4A). Re-checks the session,
// validates every field with Zod (lat −90..90, lon −180..180, feed price > 0)
// and stores the feed price in integer kobo (₦1 = 100 kobo).

const readString = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = settingsSchema.safeParse({
    name: readString(formData, "name"),
    lat: readString(formData, "lat"),
    lon: readString(formData, "lon"),
    feedPriceNaira: readString(formData, "feedPriceNaira"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const session = await getSession();
  if (!session.userId) return { error: "Your session ended — log in again." };

  const { name, lat, lon, feedPriceNaira } = parsed.data;

  try {
    const farm = await getOrCreateFarm(session.userId);
    await db.farm.update({ where: { id: farm.id }, data: { name, lat, lon } });
    await db.feedPrice.upsert({
      where: { farmId: farm.id },
      update: { priceKobo: nairaToKobo(feedPriceNaira) },
      create: { farmId: farm.id, priceKobo: nairaToKobo(feedPriceNaira) },
    });
  } catch {
    return { error: DB_BUSY_ERROR };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/weather");
  return { saved: true };
}
