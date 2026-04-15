import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  test: {
    bail: 1,
    globals: true,
    environment: "node",
    include: ["packages/server/tests/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      /** Exploratory suite: `npm run test:human-review` in a2a-server */
      "**/packages/server/tests/human-review/**",
      /** Legacy flat `src/` imports — workspace code lives under `packages/*` */
      "**/packages/server/tests/tests/unit/**",
      "packages/server/tests/tests/simulation-based.test.ts",
      "packages/server/tests/tests/transform-runtime.test.ts",
      "packages/server/tests/tests/router-dialog-routing.test.ts",
      "packages/server/tests/tests/integration/sessions.test.ts",
      "packages/server/tests/tests/integration/without-mocks.test.ts",
      "packages/server/tests/tests/integration/framework-detection-integration.test.ts",
      "packages/server/tests/tests/integration/real-integration.test.ts",
      "packages/server/tests/tests/normalization-execution-fold.test.ts",
      "packages/server/tests/tests/normalization-history-length.test.ts",
      "packages/server/tests/tests/auto-rag-history-format.test.ts",
      "packages/server/tests/tests/integration/health.test.ts",
      "packages/server/tests/tests/integration/sync-flow.test.ts",
    ],
    setupFiles: ["packages/server/tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/server/src/**/*.ts"],
      exclude: ["packages/server/src/**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "packages/server/src"),
    },
  },
});
