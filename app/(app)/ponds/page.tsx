import { PondManager, type PondSummary } from "@/components/PondManager";
import { db } from "@/lib/db";
import { getOrCreateFarm, requireUser } from "@/lib/guards";

// Ponds screen (docs/02-pondscale.md step 4A). The query is scoped by this
// user's farm id, so another farmer's ponds can never appear here
// (docs/00-global.md §3).
export const dynamic = "force-dynamic";

export default async function PondsPage() {
  const userId = await requireUser();

  let ponds: PondSummary[] = [];
  let dbDown = false;

  try {
    const farm = await getOrCreateFarm(userId);
    const rows = await db.pond.findMany({
      where: { farmId: farm.id },
      orderBy: { name: "asc" },
      include: {
        checks: { orderBy: { date: "desc" }, take: 1, select: { date: true, status: true, fcr: true } },
      },
    });
    ponds = rows.map((pond) => {
      const check = pond.checks[0];
      return {
        id: pond.id,
        name: pond.name,
        species: pond.species,
        lastCheck: check
          ? { date: check.date.toISOString().slice(0, 10), status: check.status, fcr: check.fcr }
          : null,
      };
    });
  } catch {
    dbDown = true;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Ponds</h1>
        <p className="text-muted">
          Each pond holds one fish species. A check measures feed used against the weight the fish
          gained.
        </p>
      </header>

      {dbDown ? (
        <p
          role="alert"
          className="rounded-card border border-warning bg-warning-bg p-3 text-sm font-medium text-warning"
        >
          Cannot reach the database right now, so your ponds could not be loaded. Try again in a
          moment.
        </p>
      ) : (
        <PondManager ponds={ponds} />
      )}
    </div>
  );
}
