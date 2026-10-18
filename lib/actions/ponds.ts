"use server";

import { revalidatePath } from "next/cache";
import { firstIssue, type FormState } from "@/lib/auth";
import { DB_BUSY_ERROR, pondNameSchema, pondSchema } from "@/lib/validation";
import { getOrCreateFarm } from "@/lib/guards";
import { pondForFarm } from "@/lib/ownership";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// Pond server actions (docs/02-pondscale.md step 4A). Every action re-checks
// the session itself — middleware is only the first gate — and every pond
// read goes through pondForFarm so a farmer can never touch another farmer's
// pond or checks (docs/00-global.md §3).

const readString = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

/** Session + farm for an action. Returns null (with the sentence) on failure. */
async function farmForAction(): Promise<
  { ok: true; farmId: string } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session.userId) return { ok: false, error: "Your session ended — log in again." };
  try {
    const farm = await getOrCreateFarm(session.userId);
    return { ok: true, farmId: farm.id };
  } catch {
    return { ok: false, error: DB_BUSY_ERROR };
  }
}

export async function addPond(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = pondSchema.safeParse({
    name: readString(formData, "name"),
    species: readString(formData, "species"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const scope = await farmForAction();
  if (!scope.ok) return { error: scope.error };

  try {
    await db.pond.create({
      data: { farmId: scope.farmId, name: parsed.data.name, species: parsed.data.species },
    });
  } catch {
    // Pond name is unique per farm (schema @@unique([farmId, name])).
    const duplicate = await db.pond
      .findFirst({ where: { farmId: scope.farmId, name: parsed.data.name } })
      .catch(() => null);
    if (duplicate) return { error: "A pond with that name already exists — pick another name." };
    return { error: DB_BUSY_ERROR };
  }

  revalidatePath("/ponds");
  revalidatePath("/");
  return null;
}

export async function renamePond(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = pondNameSchema.safeParse({ name: readString(formData, "name") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const scope = await farmForAction();
  if (!scope.ok) return { error: scope.error };

  const pondId = readString(formData, "pondId");
  try {
    const pond = await pondForFarm(db, pondId, scope.farmId);
    if (!pond) return { error: "That pond is not on your farm — check the name and try again." };
    await db.pond.update({ where: { id: pond.id }, data: { name: parsed.data.name } });
  } catch {
    const duplicate = await db.pond
      .findFirst({ where: { farmId: scope.farmId, name: parsed.data.name } })
      .catch(() => null);
    if (duplicate) return { error: "A pond with that name already exists — pick another name." };
    return { error: DB_BUSY_ERROR };
  }

  revalidatePath("/ponds");
  revalidatePath("/");
  return null;
}

export async function deletePond(_prev: FormState, formData: FormData): Promise<FormState> {
  const scope = await farmForAction();
  if (!scope.ok) return { error: scope.error };

  const pondId = readString(formData, "pondId");
  try {
    const pond = await pondForFarm(db, pondId, scope.farmId);
    if (!pond) return { error: "That pond is not on your farm — refresh and try again." };
    // Deleting a pond deletes its checks (FK ON DELETE CASCADE, schema).
    await db.pond.delete({ where: { id: pond.id } });
  } catch {
    return { error: DB_BUSY_ERROR };
  }

  revalidatePath("/ponds");
  revalidatePath("/");
  return { saved: true };
}
