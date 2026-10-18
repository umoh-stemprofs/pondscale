import { FishPriceCards } from "@/components/FishPriceCards";
import { loadPriceCards } from "@/lib/market/view";
import { requireUser } from "@/lib/guards";

// Market screen (docs/02-pondscale.md page 4): today's tilapia and catfish
// prices, each carrying its data-source badge. The same quotes feed the
// stock value on the dashboard.
export const dynamic = "force-dynamic";

export default async function MarketPage() {
  await requireUser();
  const cards = await loadPriceCards();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Fish prices</h1>
        <p className="text-muted">
          Today&apos;s price per kilogram. The badge on each card says where the price came from.
        </p>
      </header>

      <div className="max-w-2xl">
        <FishPriceCards cards={cards} />
      </div>
    </div>
  );
}
