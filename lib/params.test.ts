import { describe, expect, it } from "vitest";
import { firstParam } from "./params";

// Regression cover for the wizard crash: ?fish=1&fish=2 reached the page as
// string[] and the old code called .trim() on it → HTTP 500. Every URL
// parameter must normalise to a string (or undefined) instead.

describe("firstParam", () => {
  it("passes a plain string through unchanged", () => {
    expect(firstParam("pond_good")).toBe("pond_good");
    expect(firstParam("")).toBe("");
  });

  it("treats missing and empty input as absent", () => {
    expect(firstParam(undefined)).toBeUndefined();
    expect(firstParam([])).toBeUndefined();
  });

  it("keeps the first value of a repeated parameter (?fish=1&fish=2)", () => {
    expect(firstParam(["1000", "7"])).toBe("1000");
    expect(firstParam([""])).toBe("");
  });
});
