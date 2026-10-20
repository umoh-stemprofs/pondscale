import type { Farm } from "@prisma/client";
import { SettingsForm } from "@/components/SettingsForm";
import { db } from "@/lib/db";
import { getOrCreateFarm, requireUser } from "@/lib/guards";

// Farm settings (docs/02-pondscale.md step 4A: S-FARM plus feed price). Reads
// only this user's farm — the id comes from the session, never the URL.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireUser();

  let farm: Farm | null = null;
  let feedPriceKobo: number | null = null;
  let dbDown = false;

  try {
    farm = await getOrCreateFarm(userId);
    // The feed price row depends only on the farm id, so it runs alongside
    // nothing else here — but it is one round trip, not two serial ones.
    const price = await db.feedPrice.findUnique({ where: { farmId: farm.id } });
    feedPriceKobo = price?.priceKobo ?? null;
  } catch {
    dbDown = true;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Farm settings</h1>
        <p className="text-muted">
          Your farm location sets the weather forecast. The feed price sets feed cost per kg of fish
          grown.
        </p>
      </header>

      {dbDown || !farm ? (
        <div
          role="alert"
          className="rounded-card border border-warning bg-warning-bg p-4 text-sm font-medium text-warning"
        >
          Cannot reach the database right now, so your settings could not be loaded.{" "}
          <a href="/settings" className="underline underline-offset-2">
            Try again
          </a>
          .
        </div>
      ) : (
        <SettingsForm
          farm={{ name: farm.name, lat: farm.lat, lon: farm.lon }}
          feedPriceNaira={feedPriceKobo === null ? "" : String(feedPriceKobo / 100)}
        />
      )}
    </div>
  );
}
