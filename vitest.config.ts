import { defineConfig } from "vitest/config";

const coverageThreshold = Number(
  process.env.COVERAGE_THRESHOLD ?? 60
);

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
    },

    setupFiles: ["./tests/setup.ts"],

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],

      thresholds: {
        statements: coverageThreshold,
        branches: coverageThreshold,
        functions: coverageThreshold,
        lines: coverageThreshold,
      },
    },
  },
});