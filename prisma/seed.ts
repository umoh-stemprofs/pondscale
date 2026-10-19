import "dotenv/config";
import { CheckStatus, Crop, PrismaClient, Species, Unit } from "@prisma/client";
import { hash } from "bcryptjs";

/**
 * Seed for step 1: one farmer, one farm, feed price, seven days of fish
 * prices, and ONE POND PER STATUS — all five outcomes of the check logic in
 * docs/02-pondscale.md — so every result state can be seen from day one.
 *
 * Idempotent: running it twice leaves the same rows, not duplicates.
 * Demo password is documented in README.md only.
 */

const db = new PrismaClient();

const DEMO = {
  userId: "usr_demo",
  email: "demo@pondscale.test",
  name: "Chidi Okafor",
  password: "demo1234",
  farmId: "farm_demo",
  farmName: "Port Harcourt farm",
  // Default farm location from docs/00-global.md §3.
  lat: 4.8156,
  lon: 7.0498,
};

// ₦1,200 per kg of feed = 120,000 kobo. Placeholder: confirm with the farm.
const FEED_PRICE_KOBO = 120000;

/** Today's calendar day in APP_TZ, never the server's clock zone. */
function todayInAppTz(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TZ || "Africa/Lagos",
  }).format(new Date());
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const daysAgo = (n: number): Date =>
  new Date(todayInAppTz().getTime() - n * 86_400_000);

/**
 * Seven days of SIMULATED fish prices (oldest first, last one is today).
 * Step 2 replaces this with the deterministic generator; until then these
 * keep the stock-value maths honest at the catalog prices from §3:
 * TILAPIA ₦2,500/kg, CATFISH ₦2,800/kg.
 */
const PRICE_SERIES: { crop: Crop; koboPerKg: number[] }[] = [
  { crop: Crop.TILAPIA, koboPerKg: [242000, 245000, 247000, 246000, 249000, 250000, 250000] },
  { crop: Crop.CATFISH, koboPerKg: [272000, 275000, 276000, 278000, 279000, 281000, 280000] },
];

/**
 * One pond per status. Each row's numbers were chosen to land exactly on its
 * status under docs/02-pondscale.md rule order (values below are placeholders
 * until an expert reviews them):
 *
 *   GOOD           FCR = 55 / 35   = 1.57 · ADG = 35/30 = 1.17 ≥ 1.0
 *   SLOW_GROWTH    FCR = 15 / 10   = 1.50 · ADG = 20/30 = 0.67 < 1.0
 *   TOO_MUCH_FEED  FCR = 30 / 12   = 2.50 > 1.8 (catfish fcrMax)
 *   CHECK_NUMBERS  FCR = 40 / 60   = 0.67 < 1.0
 *   NO_GROWTH      currentG 38 ≤ startG 40 → no FCR at all
 *
 * gainKg = fishCount × (currentG − startG) / 1000.
 */
const PONDS: {
  id: string;
  name: string;
  species: Species;
  check: {
    id: string;
    daysAgo: number;
    fishCount: number;
    days: number;
    startG: number;
    currentG: number;
    feedKg: number;
    status: CheckStatus;
    fcr: number | null;
    adgGPerDay: number;
    feedCostPerKgGainKobo: number | null;
    stockValueKobo: number;
  };
}[] = [
  {
    id: "pond_good",
    name: "Mango Creek",
    species: Species.TILAPIA,
    check: {
      id: "chk_good", daysAgo: 6, fishCount: 1000, days: 30, startG: 25, currentG: 60,
      feedKg: 55, status: CheckStatus.GOOD, fcr: 1.57, adgGPerDay: 1.17,
      // 1.57 × ₦1,200 = ₦1,884/kg · 1000 × 60 g × ₦2,500 = ₦150,000
      feedCostPerKgGainKobo: 188400, stockValueKobo: 15000000,
    },
  },
  {
    id: "pond_slow",
    name: "Palm Grove",
    species: Species.TILAPIA,
    check: {
      id: "chk_slow", daysAgo: 9, fishCount: 500, days: 30, startG: 25, currentG: 45,
      feedKg: 15, status: CheckStatus.SLOW_GROWTH, fcr: 1.5, adgGPerDay: 0.67,
      // 1.5 × ₦1,200 = ₦1,800/kg · 500 × 45 g × ₦2,500 = ₦56,250
      feedCostPerKgGainKobo: 180000, stockValueKobo: 5625000,
    },
  },
  {
    id: "pond_too_much",
    name: "Creek Side",
    species: Species.CATFISH,
    check: {
      id: "chk_too_much", daysAgo: 12, fishCount: 200, days: 30, startG: 50, currentG: 110,
      feedKg: 30, status: CheckStatus.TOO_MUCH_FEED, fcr: 2.5, adgGPerDay: 2.0,
      // 2.5 × ₦1,200 = ₦3,000/kg · 200 × 110 g × ₦2,800 = ₦61,600
      feedCostPerKgGainKobo: 300000, stockValueKobo: 6160000,
    },
  },
  {
    id: "pond_check_numbers",
    name: "Nursery Pond",
    species: Species.TILAPIA,
    check: {
      id: "chk_check_numbers", daysAgo: 15, fishCount: 1000, days: 30, startG: 100, currentG: 160,
      feedKg: 40, status: CheckStatus.CHECK_NUMBERS, fcr: 0.67, adgGPerDay: 2.0,
      // 0.67 × ₦1,200 = ₦804/kg · 1000 × 160 g × ₦2,500 = ₦400,000
      feedCostPerKgGainKobo: 80400, stockValueKobo: 40000000,
    },
  },
  {
    id: "pond_no_growth",
    name: "Back Pond",
    species: Species.TILAPIA,
    check: {
      id: "chk_no_growth", daysAgo: 18, fishCount: 800, days: 14, startG: 40, currentG: 38,
      feedKg: 35, status: CheckStatus.NO_GROWTH, fcr: null, adgGPerDay: -0.14,
      // No FCR (no gain to divide by) · 800 × 38 g × ₦2,500 = ₦76,000
      feedCostPerKgGainKobo: null, stockValueKobo: 7600000,
    },
  },
];

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

const dayString = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const passHash = await hash(DEMO.password, 10);

  const user = await db.user.upsert({
    where: { email: DEMO.email },
    update: { name: DEMO.name, passHash },
    create: { id: DEMO.userId, email: DEMO.email, name: DEMO.name, passHash },
  });

  const farm = await db.farm.upsert({
    where: { id: DEMO.farmId },
    update: { userId: user.id, name: DEMO.farmName, lat: DEMO.lat, lon: DEMO.lon, currency: "NGN" },
    create: {
      id: DEMO.farmId, userId: user.id, name: DEMO.farmName,
      lat: DEMO.lat, lon: DEMO.lon, currency: "NGN",
    },
  });

  await db.feedPrice.upsert({
    where: { farmId: farm.id },
    update: { priceKobo: FEED_PRICE_KOBO },
    create: { farmId: farm.id, priceKobo: FEED_PRICE_KOBO },
  });

  // Fish prices: upserted by unique(crop, date), so a re-run never duplicates
  // and step 2's generator can overwrite them in place later.
  let tickCount = 0;
  for (const series of PRICE_SERIES) {
    for (let i = 0; i < series.koboPerKg.length; i++) {
      const date = daysAgo(series.koboPerKg.length - 1 - i);
      const data = { crop: series.crop, priceKobo: series.koboPerKg[i], unit: Unit.KG, source: "SIMULATED" as const };
      await db.priceTick.upsert({
        where: { crop_date: { crop: series.crop, date } },
        update: { priceKobo: data.priceKobo },
        create: { ...data, date },
      });
      tickCount++;
    }
  }

  for (const pond of PONDS) {
    const { check, ...pondData } = pond;
    await db.pond.upsert({
      where: { id: pond.id },
      update: { farmId: farm.id, ...pondData },
      create: { ...pondData, farmId: farm.id },
    });

    const { daysAgo: age, ...checkData } = check;
    await db.check.upsert({
      where: { id: check.id },
      update: { pondId: pond.id, date: daysAgo(age), ...checkData },
      create: { ...checkData, pondId: pond.id, date: daysAgo(age) },
    });
  }

  // Make a re-run converge on exactly this demo data: one pond per status,
  // one check per pond (idempotent). Anything else on THIS farm goes — for
  // example the checks saved while click-testing the step-4B wizard. Ponds
  // and checks are scoped to farm_demo, so no other account's data can be
  // touched; deleting a pond cascades to its checks (schema FK).
  const seedCheckIds = PONDS.map((pond) => pond.check.id);
  await db.pond.deleteMany({
    where: { farmId: farm.id, id: { notIn: PONDS.map((p) => p.id) } },
  });
  await db.check.deleteMany({
    where: { pond: { farmId: farm.id }, id: { notIn: seedCheckIds } },
  });

  const [feedPrice, ponds] = await Promise.all([
    db.feedPrice.findUnique({ where: { farmId: farm.id } }),
    db.pond.findMany({
      where: { farmId: farm.id },
      orderBy: { name: "asc" },
      include: { checks: { orderBy: { date: "desc" }, take: 1 } },
    }),
  ]);

  console.log(`\nFarm   ${farm.name} (${farm.lat}, ${farm.lon}) · ${farm.currency}`);
  console.log(`User   ${user.name} <${user.email}>`);
  console.log(`Feed   ${feedPrice ? naira(feedPrice.priceKobo) : "?"} per kg`);
  console.log(`Prices ${tickCount} ticks over ${PRICE_SERIES[0].koboPerKg.length} days (Simulated)\n`);
  console.log(`Ponds  ${ponds.length} — one per status:`);
  for (const pond of ponds) {
    const check = pond.checks[0];
    console.log(
      `       ${pond.name.padEnd(14)} ${pond.species.padEnd(7)} ` +
        (check
          ? `${check.status.padEnd(13)} FCR ${check.fcr === null ? "  —  " : check.fcr.toFixed(2)} · stock ${naira(check.stockValueKobo)} (as of ${dayString(check.date)})`
          : "no checks yet"),
    );
  }
  console.log(`\nSeed complete.\n`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });