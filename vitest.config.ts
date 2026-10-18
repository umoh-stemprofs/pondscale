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
  },
});