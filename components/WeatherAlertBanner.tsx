"use client";

// The pond feeding alert banner (docs/02-pondscale.md) with the step-5 demo
// switch: when DEMO_MODE=true, a small "Demo: show weather alert" switch can
// preview the banner even on a calm forecast — it shows the banner text with
// a "Demo preview" label and changes NO data. The real forecast alert always
// wins and never carries the demo label.

import { useState } from "react";
import { POND_FEED_ALERT } from "@/lib/weather/alerts";

export function WeatherAlertBanner({
  alert,
  demoMode,
}: {
  alert: string | null;
  demoMode: boolean;
}) {
  const [demoOn, setDemoOn] = useState(false);
  const fromDemo = alert === null && demoOn;
  const text = alert ?? (fromDemo ? POND_FEED_ALERT : null);

  return (
    <div className="space-y-2">
      {demoMode ? (
        <button
          type="button"
          role="switch"
          aria-checked={demoOn}
          onClick={() => setDemoOn((value) => !value)}
          className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-muted hover:bg-bg"
        >
          <span
            aria-hidden="true"
            className={`inline-flex h-5 w-9 items-center rounded-full transition ${
              demoOn ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                demoOn ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
          Demo: show weather alert
        </button>
      ) : null}

      {text ? (
        <p
          role="status"
          className="rounded-card border border-warning bg-warning-bg p-3 text-sm font-medium text-warning"
        >
          <span aria-hidden="true">!</span> {fromDemo ? "Demo preview — " : ""}
          {text}
        </p>
      ) : null}
    </div>
  );
}
