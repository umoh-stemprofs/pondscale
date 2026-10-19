import type { Species } from "@prisma/client";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { StatusPillLarge } from "@/components/StatusPill";
import { checkForFarm } from "@/lib/check/service";
import { db } from "@/lib/db";
import { FCR_MESSAGES, FCR_SHORT_NOTE, NEGATIVE_MARGIN_MESSAGE } from "@/lib/fcr";
import { fmtCount, fmtDay, fmtFcr, naira, speciesLabel } from "@/lib/format";
import { getOrCreateFarm, requireUser } from "@/lib/guards";

// One saved check, in full (docs/02-pondscale.md step 4B: "open a check to
// see its full result"). The stored numbers and prices are shown as they
// were at save time — nothing is recomputed from today's feed, so an old
// check never changes its story. Ownership is part of the WHERE clause
// inside checkForFarm (docs/00-global.md §3).
export const dynamic = "force-dynamic";

export default async function CheckDetailPage({ params }: { params: { id: string } }) {
  const userId = await requireUser();

  let check = null;
  let pondName = "";
  let species: Species | null = null;
  let dbDown = false;

  try {
    const farm = await getOrCreateFarm(userId);
    check = await checkForFarm(db, params.id, farm.id);
    if (check) {
      const pond = await db.pond.findFirst({
        where: { id: check.pondId, farmId: farm.id },
        select: { name: true, species: true },
      });
      if (pond) {
        pondName = pond.name;
        species = pond.species;
      } else {
        check = null; // pond deleted since — the check goes with it (cascade)
      }
    }
  } catch {
    dbDown = true;
  }

  const backLink = (
    <Link href="/check/history" className="font-medium text-accent">
      Back to history
    </Link>
  );

  if (dbDown) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Saved check</h1>
        <p
          role="alert"
          className="rounded-card border border-warning bg-warning-bg p-3 text-sm font-medium text-warning"
        >
          Cannot reach the database right now. Try again in a moment.
        </p>
        {backLink}
      </div>
    );
  }

  if (!check) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Saved check</h1>
        <p
          role="alert"
          className="rounded-card border border-danger bg-danger-bg p-3 text-sm font-medium text-danger"
        >
          That check is not on your farm — pick one from your history.
        </p>
        {backLink}
      </div>
    );
  }

  // Money margin from the prices stored with the check (fish price may be
  // null on rows saved before step 4B).
  const marginPerKgKobo =
    check.fishPriceKobo !== null && check.feedCostPerKgGainKobo !== null
      ? check.fishPriceKobo - check.feedCostPerKgGainKobo
      : null;
  const dateIso = check.date.toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{pondName}</h1>
        <p className="text-muted">
          {species ? `${speciesLabel(species)} · ` : ""}Checked {fmtDay(dateIso)}
        </p>
      </header>

      <div className="space-y-3 rounded-card border border-border bg-surface p-5 shadow-card">
        <StatusPillLarge status={check.status} />
        <p className="text-lg">{FCR_MESSAGES[check.status]}</p>
        {check.days < 7 ? (
          <p className="rounded-input bg-info-bg p-3 text-sm font-medium text-info">
            <span aria-hidden="true">ℹ</span> {FCR_SHORT_NOTE}.
          </p>
        ) : null}
      </div>

      <section aria-label="Result numbers" className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="FCR"
          value={fmtFcr(check.fcr)}
          sub={check.fcr === null ? "No growth, so no FCR" : "Feed used ÷ weight gained"}
        />
        <StatCard
          label="Growth"
          value={`${check.adgGPerDay.toFixed(2)} g`}
          sub="Per fish per day"
        />
        <StatCard
          label="Feed cost per kg gained"
          value={check.feedCostPerKgGainKobo === null ? "—" : naira(check.feedCostPerKgGainKobo)}
          sub={
            check.feedCostPerKgGainKobo === null
              ? check.status === "NO_GROWTH"
                ? "No growth, so there is no gain to cost"
                : "No feed price was set"
              : `At FCR ${fmtFcr(check.fcr)}`
          }
        />
        <StatCard
          label="Stock value of the pond"
          value={naira(check.stockValueKobo)}
          sub={
            check.fishPriceKobo === null
              ? `As of ${fmtDay(dateIso)}`
              : `${fmtCount(check.fishCount)} fish · fish price ${naira(check.fishPriceKobo)}/kg · as of ${fmtDay(dateIso)}`
          }
        />
      </section>

      {marginPerKgKobo !== null && marginPerKgKobo < 0 ? (
        <p
          role="alert"
          className="rounded-card border border-danger bg-danger-bg p-3 font-medium text-danger"
        >
          <span aria-hidden="true">!</span> {NEGATIVE_MARGIN_MESSAGE}
        </p>
      ) : marginPerKgKobo !== null ? (
        <p className="rounded-card border border-border bg-surface p-3 font-medium">
          Each kg of fish gained earns {naira(marginPerKgKobo)} more than the feed costs.
        </p>
      ) : null}

      <p className="text-sm text-muted">
        Saved numbers: {fmtCount(check.fishCount)} fish · {check.days} days · {check.startG} g →{" "}
        {check.currentG} g · {check.feedKg} kg feed.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/check?pond=${check.pondId}&step=1`}
          className="flex h-12 items-center justify-center gap-2 rounded-input bg-accent px-5 font-medium text-white"
        >
          Check this pond again
        </Link>
        <Link
          href={`/check/history?pond=${check.pondId}`}
          className="flex h-12 items-center justify-center rounded-input border border-border bg-surface px-5 font-medium text-text"
        >
          This pond&apos;s history
        </Link>
      </div>
      {backLink}
    </div>
  );
}
