import { describe, expect, it } from "vitest";
import { FINE_FEED_TIP, POND_FEED_ALERT, farmTip, pondWeatherAlert } from "./alerts";
import type { DailyForecast } from "./schemas";

// docs/02-pondscale.md: maxC ≥ 34 or rain ≥ 20 mm tomorrow → feed 10% less
// today. Thresholds come from /lib/config.ts (sample values).

const day = (overrides: Partial<DailyForecast> = {}): DailyForecast => ({
  date: "2026-10-18",
  minC: 24,
  maxC: 30,
  rainMm: 0,
  rainChancePct: 10,
  ...overrides,
});

describe("pondWeatherAlert", () => {
  it("alerts exactly at 34 °C", () => {
    expect(pondWeatherAlert([day({ maxC: 34 }), day(), day(), day(), day()])).toBe(POND_FEED_ALERT);
  });

  it("alerts when tomorrow has exactly 20 mm of rain", () => {
    expect(
      pondWeatherAlert([day(), day({ rainMm: 20, rainChancePct: 90 }), day(), day(), day()]),
    ).toBe(POND_FEED_ALERT);
  });

  it("stays quiet below both thresholds", () => {
    expect(
      pondWeatherAlert([day({ maxC: 33.9 }), day({ rainMm: 19.9 }), day(), day(), day()]),
    ).toBeNull();
  });

  it("needs a tomorrow entry for the rain rule (heat alone still counts)", () => {
    expect(pondWeatherAlert([day({ rainMm: 50 })])).toBeNull();
    expect(pondWeatherAlert([day({ maxC: 36 })])).toBe(POND_FEED_ALERT);
  });
});

describe("farmTip", () => {
  it("follows the forecast with the feeding advice when it crosses a threshold", () => {
    expect(farmTip([day({ maxC: 34 }), day(), day(), day(), day()])).toBe(POND_FEED_ALERT);
    expect(farmTip([day(), day({ rainMm: 20 }), day(), day(), day()])).toBe(POND_FEED_ALERT);
  });

  it("gives the calm sentence otherwise", () => {
    expect(farmTip([day({ maxC: 31 }), day({ rainMm: 5 }), day(), day(), day()])).toBe(
      FINE_FEED_TIP,
    );
  });
});