import { Crop, type Farm, type Species } from "@prisma/client";
import Link from "next/link";
import { NumberStepper } from "@/components/NumberStepper";
import { SaveCheckButton } from "@/components/SaveCheckButton";
import { StatCard } from "@/components/StatCard";
import { StatusPillLarge } from "@/components/StatusPill";
import { WeatherAlertBanner } from "@/components/WeatherAlertBanner";
import { ChartCard } from "@/components/charts/ChartCard";
import { FcrCompareBar } from "@/components/charts/FcrCompareBar";
import { compareTableData } from "@/components/charts/tables";
import { FishIcon } from "@/components/icons";
import { checkNumbersSchema, type CheckNumbers } from "@/lib/validation";
import { SPECIES_LIMITS } from "@/lib/config";
import { db } from "@/lib/db";
import { todayIso } from "@/lib/dates";
import { evaluateWithFarmPrices } from "@/lib/check/evaluate";
import { FCR_SHORT_NOTE } from "@/lib/fcr";
import { fmtCount, fmtDay, fmtFcr, naira, speciesLabel } from "@/lib/format";
import { getOrCreateFarm, requireUser } from "@/lib/guards";
import { loadPriceCards } from "@/lib/market/view";
import { pondWeatherAlert } from "@/lib/weather/alerts";
import { loadFarmWeather } from "@/lib/weather/view";

// The check wizard and its result screen (docs/02-pondscale.md step 4B,
// design.md §2 step bar: one task per screen). The answers live in the URL,
// so the back button never loses what was typed, and every render validates
// whatever numbers are present with the same Zod schema the save action
// uses — one plain sentence next to the field that needs fixing. The pond
// list is scoped by this user's farm, so a foreign pond id simply falls back
// to the chooser (docs/00-global.md §3).
export const dynamic = "force-dynamic";

/// DEMO_MODE only adds the preview switch; it never changes data.
const DEMO_MODE = process.env.DEMO_MODE === "true";

interface WizardParams {
  pond?: string;
  step?: string;
  fish?: string;
  days?: string;
  start?: string;
  now?: string;
  feed?: string;
}

const primaryCls =
  "flex h-12 items-center justify-center gap-2 rounded-input bg-accent px-5 font-medium text-white";
const secondaryCls =
  "flex h-12 items-center justify-center gap-2 rounded-input border border-border bg-surface px-5 font-medium text-text";

function FieldError({ text }: { text: string }) {
  return (
    <p role="alert" className="mt-1 flex items-start gap-1.5 text-sm font-medium text-danger">
      <span aria-hidden="true">!</span> {text}
    </p>
  );
}

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted">Step {step} of 3</p>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-accent" : "bg-border"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default async function CheckWizardPage({
  searchParams,
}: {
  searchParams: WizardParams;
}) {
  const userId = await requireUser();

  let farm: Farm | null = null;
  let ponds: { id: string; name: string; species: Species }[] = [];
  let feedPriceKobo: number | null = null;
  let dbDown = false;

  try {
    farm = await getOrCreateFarm(userId);
    ponds = await db.pond.findMany({
      where: { farmId: farm.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, species: true },
    });
    const feedPrice = await db.feedPrice.findUnique({ where: { farmId: farm.id } });
    feedPriceKobo = feedPrice?.priceKobo ?? null;
  } catch {
    dbDown = true;
  }

  const shell = (body: React.ReactNode) => (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">New check</h1>
        <p className="text-muted">
          Measure feed used against the weight the fish gained to see if your feeding is right.
        </p>
      </header>
      {body}
    </div>
  );

  if (dbDown) {
    return shell(
      <div className="space-y-3">
        <p
          role="alert"
          className="rounded-card border border-warning bg-warning-bg p-3 text-sm font-medium text-warning"
        >
          Cannot reach the database right now, so the check cannot start. Try again in a moment.
        </p>
        <Link href="/check" className={secondaryCls}>
          Try again
        </Link>
      </div>,
    );
  }

  // No ponds yet → no dead end: send the farmer to add one.
  if (ponds.length === 0) {
    return shell(
      <div className="rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <FishIcon className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-2 font-medium">No ponds yet</p>
        <p className="text-sm text-muted">Add a pond first, then record a check for it.</p>
        <Link
          href="/ponds"
          className="mt-4 inline-flex h-12 items-center rounded-input bg-accent px-4 font-medium text-white"
        >
          Go to ponds
        </Link>
      </div>,
    );
  }

  // Step 0: choose the pond (cards). A pond id from another farm is not in
  // this list, so it lands here too — ownership is the WHERE clause.
  const pond = ponds.find((candidate) => candidate.id === searchParams.pond) ?? null;
  if (!pond) {
    const foreign = Boolean(searchParams.pond);
    return shell(
      <div className="space-y-4">
        {foreign ? (
          <p
            role="alert"
            className="rounded-card border border-danger bg-danger-bg p-3 text-sm font-medium text-danger"
          >
            That pond is not on your farm — pick one below.
          </p>
        ) : null}
        <h2 className="text-lg font-semibold">Which pond are you checking?</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ponds.map((candidate) => (
            <li key={candidate.id}>
              <Link
                href={`/check?pond=${candidate.id}&step=1`}
                className="flex h-full flex-col justify-between gap-2 rounded-card border border-border bg-surface p-4 shadow-card hover:border-accent"
              >
                <div>
                  <p className="font-medium">{candidate.name}</p>
                  <p className="text-sm text-muted">{speciesLabel(candidate.species)}</p>
                </div>
                <span className="text-sm font-medium text-accent">Start check →</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/" className={secondaryCls}>
          Back to dashboard
        </Link>
      </div>,
    );
  }

  // Validate whatever numbers are present, one sentence per field.
  const present = (value: string | undefined): string | null => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };
  const raw = {
    fishCount: present(searchParams.fish),
    days: present(searchParams.days),
    startG: present(searchParams.start),
    currentG: present(searchParams.now),
    feedKg: present(searchParams.feed),
  } satisfies Record<keyof CheckNumbers, string | null>;

  const errors: Partial<Record<keyof CheckNumbers, string>> = {};
  const values: Partial<Record<keyof CheckNumbers, number>> = {};
  const shape = checkNumbersSchema.shape;
  for (const key of Object.keys(raw) as (keyof CheckNumbers)[]) {
    const text = raw[key];
    if (text === null) continue;
    const field = shape[key].safeParse(text);
    if (field.success) values[key] = field.data;
    else errors[key] = field.error.issues[0]?.message ?? "Check this number and try again.";
  }

  const step1Ok = values.fishCount !== undefined && values.days !== undefined;
  const step2Ok = step1Ok && values.startG !== undefined && values.currentG !== undefined;
  const step3Ok = step2Ok && values.feedKg !== undefined;

  // Clamp the requested step to what the numbers allow: an invalid (or
  // hand-edited) URL shows the step that needs fixing, with the error beside
  // the field.
  const requested = searchParams.step ?? "1";
  let view: "1" | "2" | "3" | "result" = "1";
  if (requested === "2") view = step1Ok ? "2" : "1";
  else if (requested === "3") view = step2Ok ? "3" : step1Ok ? "2" : "1";
  else if (requested === "result") view = step3Ok ? "result" : step2Ok ? "3" : step1Ok ? "2" : "1";

  const pondContext = (
    <p className="text-sm text-muted">
      {pond.name} · {speciesLabel(pond.species)} ·{" "}
      <Link href="/check" className="font-medium text-accent">
        Change pond
      </Link>
    </p>
  );

  const hidden = (fields: Record<string, string>) => (
    <>
      <input type="hidden" name="pond" value={pond.id} />
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );

  if (view === "1") {
    const days = Number(raw.days);
    const shortWindow = raw.days !== null && Number.isFinite(days) && days > 0 && days < 7;
    return shell(
      <form method="get" action="/check" className="space-y-5 rounded-card border border-border bg-surface p-5 shadow-card">
        {pondContext}
        <StepBar step={1} />
        <div className="space-y-4">
          <div>
            <NumberStepper id="fish" name="fish" label="Fish alive now (fish)" value={raw.fishCount ?? ""} min={1} max={100_000_000} />
            {errors.fishCount ? <FieldError text={errors.fishCount} /> : null}
          </div>
          <div>
            <NumberStepper id="days" name="days" label="Days since the last check (days)" value={raw.days ?? ""} min={1} max={3650} />
            {errors.days ? <FieldError text={errors.days} /> : null}
            {shortWindow && !errors.days ? (
              <p className="mt-1 text-sm text-muted">
                <span aria-hidden="true">ℹ</span> {FCR_SHORT_NOTE}.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" className={primaryCls}>
            Next: weights
          </button>
          <Link href="/" className={secondaryCls}>
            Cancel
          </Link>
        </div>
        {hidden({ step: "2" })}
      </form>,
    );
  }

  if (view === "2") {
    return shell(
      <form method="get" action="/check" className="space-y-5 rounded-card border border-border bg-surface p-5 shadow-card">
        {pondContext}
        <StepBar step={2} />
        <div className="space-y-4">
          <div>
            <NumberStepper id="start" name="start" label="Weight at the start (g per fish)" value={raw.startG ?? ""} min={1} max={5000} />
            {errors.startG ? <FieldError text={errors.startG} /> : null}
          </div>
          <div>
            <NumberStepper id="now" name="now" label="Weight now (g per fish)" value={raw.currentG ?? ""} min={1} max={5000} />
            {errors.currentG ? <FieldError text={errors.currentG} /> : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" className={primaryCls}>
            Next: feed used
          </button>
          <Link href={`/check?pond=${pond.id}&step=1&fish=${encodeURIComponent(raw.fishCount ?? "")}&days=${encodeURIComponent(raw.days ?? "")}`} className={secondaryCls}>
            Back
          </Link>
        </div>
        {hidden({ step: "3", fish: raw.fishCount ?? "", days: raw.days ?? "" })}
      </form>,
    );
  }

  if (view === "3") {
    return shell(
      <form method="get" action="/check" className="space-y-5 rounded-card border border-border bg-surface p-5 shadow-card">
        {pondContext}
        <StepBar step={3} />
        <div>
          <NumberStepper id="feed" name="feed" label="Feed used (kg)" value={raw.feedKg ?? ""} step={0.5} min={0} />
          {errors.feedKg ? <FieldError text={errors.feedKg} /> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" className={primaryCls}>
            See result
          </button>
          <Link
            href={`/check?pond=${pond.id}&step=2&fish=${encodeURIComponent(raw.fishCount ?? "")}&days=${encodeURIComponent(raw.days ?? "")}&start=${encodeURIComponent(raw.startG ?? "")}&now=${encodeURIComponent(raw.currentG ?? "")}`}
            className={secondaryCls}
          >
            Back
          </Link>
        </div>
        {hidden({ step: "result", fish: raw.fishCount ?? "", days: raw.days ?? "", start: raw.startG ?? "", now: raw.currentG ?? "" })}
      </form>,
    );
  }

  // ---- Result -----------------------------------------------------------
  const numbers = {
    fishCount: values.fishCount as number,
    days: values.days as number,
    startG: values.startG as number,
    currentG: values.currentG as number,
    feedKg: values.feedKg as number,
  };

  const crop = pond.species === "TILAPIA" ? Crop.TILAPIA : Crop.CATFISH;
  const priceCards = await loadPriceCards([crop]);
  const fishPriceKobo = priceCards[0]?.quote.priceKobo ?? null;

  const weather = await loadFarmWeather(
    farm ? { id: farm.id, lat: farm.lat, lon: farm.lon } : null,
  );
  const weatherAlert = weather.result.ok ? pondWeatherAlert(weather.result.daily) : null;

  // No invented numbers: without a market price there is no result screen.
  if (fishPriceKobo === null) {
    return shell(
      <div className="space-y-3 rounded-card border border-border bg-surface p-5 shadow-card">
        {pondContext}
        <p
          role="alert"
          className="rounded-card border border-warning bg-warning-bg p-3 text-sm font-medium text-warning"
        >
          Fish prices are unavailable right now, so the result cannot be calculated. Try again in
          a few minutes.
        </p>
        <Link
          href={`/check?pond=${pond.id}&step=result&fish=${numbers.fishCount}&days=${numbers.days}&start=${numbers.startG}&now=${numbers.currentG}&feed=${numbers.feedKg}`}
          className={secondaryCls}
        >
          Try again
        </Link>
      </div>,
    );
  }

  const outcome = evaluateWithFarmPrices({
    species: pond.species,
    numbers,
    feedPriceKobo,
    fishPriceKobo,
  });
  if (!outcome.ok) {
    return shell(
      <p
        role="alert"
        className="rounded-card border border-danger bg-danger-bg p-3 text-sm font-medium text-danger"
      >
        {outcome.error}
      </p>,
    );
  }

  const againHref = `/check?pond=${pond.id}&step=1&fish=${numbers.fishCount}&days=${numbers.days}&start=${numbers.startG}&now=${numbers.currentG}&feed=${numbers.feedKg}`;

  return shell(
    <div className="space-y-5">
      <div className="space-y-3 rounded-card border border-border bg-surface p-5 shadow-card">
        {pondContext}
        <div className="flex flex-wrap items-center gap-3">
          <StatusPillLarge status={outcome.status} />
        </div>
        <p className="text-lg">{outcome.message}</p>
        {outcome.note ? (
          <p className="rounded-input bg-info-bg p-3 text-sm font-medium text-info">
            <span aria-hidden="true">ℹ</span> {outcome.note}.
          </p>
        ) : null}
        {feedPriceKobo === null ? (
          <p className="rounded-input border border-warning bg-warning-bg p-3 text-sm font-medium text-warning">
            <span aria-hidden="true">!</span> Set the feed price in Settings to see feed costs.{" "}
            <Link href="/settings" className="font-medium underline">
              Open Settings
            </Link>
          </p>
        ) : null}
        <WeatherAlertBanner alert={weatherAlert} demoMode={DEMO_MODE} />
        {weatherAlert ? (
          <p className="text-sm text-muted">This advice does not change your result.</p>
        ) : null}
      </div>

      <section aria-label="Result numbers" className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="FCR"
          value={fmtFcr(outcome.fcr)}
          sub={outcome.fcr === null ? "No growth, so no FCR" : "Feed used ÷ weight gained"}
        />
        <StatCard
          label="Growth"
          value={outcome.adgGPerDay === null ? "—" : `${outcome.adgGPerDay.toFixed(2)} g`}
          sub="Per fish per day"
        />
        <StatCard
          label="Feed cost per kg gained"
          value={outcome.feedCostPerKgGainKobo === null ? "—" : naira(outcome.feedCostPerKgGainKobo)}
          sub={
            feedPriceKobo === null
              ? "Set the feed price in Settings"
              : outcome.feedCostPerKgGainKobo === null
                ? "No growth, so there is no gain to cost"
                : `At FCR ${fmtFcr(outcome.fcr)} · feed ${naira(feedPriceKobo)}/kg`
          }
        />
        <StatCard
          label="Stock value of the pond"
          value={naira(outcome.stockValueKobo)}
          sub={`${fmtCount(numbers.fishCount)} fish · fish price ${naira(fishPriceKobo)}/kg · as of ${fmtDay(todayIso())}`}
        />
      </section>

      <ChartCard
        title="This check against the limit"
        badge={{ kind: "simulated" }}
        table={compareTableData(outcome.fcr, SPECIES_LIMITS[pond.species].fcrMax)}
        empty={{
          sentence: "No growth, so there is no FCR to compare.",
          buttonLabel: "Check again",
          buttonHref: againHref,
        }}
      >
        {outcome.fcr === null ? null : (
          <FcrCompareBar fcr={outcome.fcr} fcrMax={SPECIES_LIMITS[pond.species].fcrMax} />
        )}
      </ChartCard>

      {outcome.marginMessage ? (
        <p role="alert" className="rounded-card border border-danger bg-danger-bg p-3 font-medium text-danger">
          <span aria-hidden="true">!</span> {outcome.marginMessage}
        </p>
      ) : outcome.marginPerKgKobo !== null ? (
        <p className="rounded-card border border-border bg-surface p-3 font-medium">
          Each kg of fish gained earns {naira(outcome.marginPerKgKobo)} more than the feed costs.
        </p>
      ) : null}

      <p className="text-sm text-muted">
        Your numbers: {fmtCount(numbers.fishCount)} fish · {numbers.days} days ·{" "}
        {numbers.startG} g → {numbers.currentG} g · {numbers.feedKg} kg feed.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SaveCheckButton pondId={pond.id} numbers={numbers} />
        <Link href={againHref} className={secondaryCls}>
          Check again
        </Link>
      </div>
      <p className="text-sm text-muted">
        <Link href="/check/history" className="font-medium text-accent">
          View saved checks
        </Link>
      </p>
    </div>,
  );
}
