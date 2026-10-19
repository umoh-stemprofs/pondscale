"use client";

// Number stepper (docs/02-pondscale.md step 4B wizard): one number per row
// with − / + buttons (48 px touch targets, design.md §1) and the unit in the
// label. The value is a plain form input, so submitting a step puts the
// answers in the URL — the back button never loses what was typed.

import { useState } from "react";
import { MinusIcon, PlusIcon } from "./icons";

interface NumberStepperProps {
  id: string;
  name: string;
  label: string;
  /// Current value from the URL ("" on a fresh visit).
  value: string;
  step?: number;
  min?: number;
  max?: number;
}

const inputCls =
  "h-12 w-full min-w-0 rounded-input border border-border bg-surface px-3 text-base tabular-nums outline-none focus:border-accent";
const buttonCls =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-input border border-border bg-surface text-text hover:bg-bg";

export function NumberStepper({ id, name, label, value, step = 1, min, max }: NumberStepperProps) {
  const [text, setText] = useState(value);

  const clamp = (n: number): number => {
    if (min !== undefined && n < min) return min;
    if (max !== undefined && n > max) return max;
    return n;
  };

  const nudge = (delta: number): void => {
    const current = Number(text);
    const base = Number.isFinite(current) && text.trim() !== "" ? current : (min ?? 0);
    setText(String(clamp(base + delta)));
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => nudge(-step)}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className={buttonCls}
        >
          <MinusIcon className="h-5 w-5" />
        </button>
        <input
          id={id}
          name={name}
          type="number"
          inputMode="decimal"
          step="any"
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
          {...(min !== undefined ? { min } : {})}
          {...(max !== undefined ? { max } : {})}
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => nudge(step)}
          aria-label={`Increase ${label.toLowerCase()}`}
          className={buttonCls}
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
