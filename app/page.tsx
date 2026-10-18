import { CheckStatus, Crop } from "@prisma/client";
import { db } from "@/lib/db";

// Step 1 smoke check: proves the schema, migration and seed work through the
// app. Replaced by the dashboard in a later step, so it is deliberately plain.
export const dynamic = "force-dynamic";

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

// design.md §2: status is never colour alone — icon + word, too.
const STATUS: Record<CheckStatus, { label: string; icon: string; cls: string }> = {
  GOOD: { label: "Good", icon: "✓", cls: "bg-success-bg text-success" },
  SLOW_GROWTH: { label: "Slow growth", icon: "!", cls: "bg-warning-bg text-warning" },
  TOO_MUCH_FEED: { label: "Too much feed", icon: "!", cls: "bg-warning-bg text-warning" },
  CHECK_NUMBERS: { label: "Check numbers", icon: "×", cls: "bg-danger-bg text-danger" },
  NO_GROWTH: { label: "No growth", icon: "×", cls: "bg-danger-bg text-danger" },
};

const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default async function StepOneCheck() {
  let content: React.ReactNode;

  try {
    const farm = await db.farm.findFirst({
      orderBy: { createdAt: "asc" },
      include: {
        user: true,
        feedPrices: true,
        ponds: {
          orderBy: { name: "asc" },
          include: { checks: { orderBy: { date: "desc" }, take: 1 } },
        },
      },
    });

    if (!farm) {
      content = (
        <p className="text-muted">
          Database is reachable but empty. Run <code>npm run db:seed</code>.
        </p>
      );
    } else {
      const ticks = await db.priceTick.findMany({
        where: { crop: { in: [Crop.TILAPIA, Crop.CATFISH] } },
        orderBy: { date: "desc" },
        take: 14,
      });
      const latestPrice = (crop: Crop) => ticks.find((t) => t.crop === crop);
      const feedPrice = farm.feedPrices[0];

      const checks = farm.ponds.map((p) => p.checks[0]).filter(Boolean);
      const totalStock = checks.reduce((sum, c) => sum + c.stockValueKobo, 0);

      content = (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">{farm.name}</h2>
            <p className="text-muted">
              {farm.user.name} · {farm.lat}, {farm.lon} · {farm.currency}
              {feedPrice ? <> · feed {naira(feedPrice.priceKobo)}/kg</> : null}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[Crop.TILAPIA, Crop.CATFISH].map((crop) => {
              const tick = latestPrice(crop);
              return (
                <div key={crop} className="rounded-card border border-border bg-surface p-4 shadow-card">
                  <p className="text-sm font-medium text-muted">{crop}</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {tick ? `${naira(tick.priceKobo)}/kg` : "No price yet"}
                  </p>
                  <p className="text-sm text-info">◼ Simulated</p>
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <table className="w-full text-left">
              <caption className="sr-only">Seeded ponds, one per check status</caption>
              <thead className="border-b border-border text-sm text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Pond</th>
                  <th scope="col" className="px-4 py-3 font-medium">Species</th>
                  <th scope="col" className="px-4 py-3 font-medium">Last check</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">FCR</th>
                  <th scope="col" className="px-4 py-3 font-medium">Feed cost / kg gained</th>
                  <th scope="col" className="px-4 py-3 font-medium">Stock value</th>
                </tr>
              </thead>
              <tbody>
                {farm.ponds.map((pond) => {
                  const check = pond.checks[0];
                  const status = check ? STATUS[check.status] : null;
                  return (
                    <tr key={pond.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{pond.name}</td>
                      <td className="px-4 py-3">{pond.species}</td>
                      <td className="px-4 py-3">{check ? fmtDay(check.date) : "—"}</td>
                      <td className="px-4 py-3">
                        {check && status ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${status.cls}`}>
                            <span aria-hidden="true">{status.icon}</span> {status.label}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{check?.fcr != null ? check.fcr.toFixed(2) : "—"}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {check?.feedCostPerKgGainKobo != null ? naira(check.feedCostPerKgGainKobo) : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {check ? naira(check.stockValueKobo) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-muted">
            {farm.ponds.length} ponds · {checks.length} saved checks · total stock value{" "}
            <span className="font-medium text-text">{naira(totalStock)}</span>. Every status appears
            once, so the demo can show every state. FCR logic, weather and screens arrive in steps 2–8.
          </p>
        </div>
      );
    }
  } catch (error) {
    content = (
      <div className="rounded-card border border-danger bg-danger-bg p-4">
        <p className="font-medium text-danger">Cannot reach the database</p>
        <p className="text-muted">
          Check DATABASE_URL in .env, then run <code>npm run db:migrate</code> and{" "}
          <code>npm run db:seed</code>.
        </p>
        <p className="mt-2 text-sm text-muted">{String(error)}</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium text-accent">Step 1 check</p>
        <h1 className="text-3xl font-bold">PondScale</h1>
        <p className="mt-1 text-muted">
          Is my fish feed right? Schema, migration and seed are in place. This page is temporary.
        </p>
      </header>
      {content}
    </main>
  );
}