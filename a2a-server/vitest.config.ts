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
