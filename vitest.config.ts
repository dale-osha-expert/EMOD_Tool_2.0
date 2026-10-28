import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Set here rather than inferred from tsconfig, whose jsx setting belongs to
  // Next (it rewrites it on build). Vitest 5 runs on Vite 8, which transforms
  // with oxc; the esbuild option this replaced is no longer read, and without
  // it the .tsx tests fail to parse.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"] },
});
