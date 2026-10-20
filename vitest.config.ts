import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Alias "@" → project root, matching tsconfig's "@/*": ["./*"].
const root = fileURLToPath(new URL(".", import.meta.url))
  .replace(/\\/g, "/")
  .replace(/\/$/, "");

export default defineConfig({
  resolve: {
    alias: { "@": root },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // bcrypt cost 10 is REQUIRED (docs/00-global.md §2/§3) and takes ~1.4 s
    // per hash/verify on this PC (§0: slow machine). The auth tests perform
    // several in one test, so vitest's 5 s default flags the intended
    // slowness as a failure. Assertions are unchanged; only the ceiling moves.
    testTimeout: 20_000,
  },
});