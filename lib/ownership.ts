import type { Species } from "@prisma/client";

// Ownership helper (docs/00-global.md §3 security: "a farmer sees only their
// farm"). Every pond read in an action or page goes through pondForFarm, so a
// guessed pond id from another farm can never come back. The store interface
// lets tests exercise the scoping without a database.

export interface OwnedPond {
  id: string;
  farmId: string;
  name: string;
  species: Species;
}

/// The slice of PrismaClient that pondForFarm needs.
export interface PondStore {
  pond: {
    findFirst(args: { where: { id: string; farmId: string } }): Promise<OwnedPond | null>;
  };
}

/**
 * Load one pond only if it belongs to `farmId`. Missing ids return null —
 * ownership is part of the WHERE clause, never a check after the fact.
 */
export async function pondForFarm(
  store: PondStore,
  pondId: string,
  farmId: string,
): Promise<OwnedPond | null> {
  if (!pondId || !farmId) return null;
  return store.pond.findFirst({ where: { id: pondId, farmId } });
}
