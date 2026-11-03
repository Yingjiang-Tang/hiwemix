import { defineConfig, devices } from "@playwright/test";

process.env.FORMULA_YEAR_TEST_BACKEND = "http://127.0.0.1:54329";
process.env.FORMULA_YEAR_TEST_RUN_ID ??= String(Date.now());
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "formula-years.spec.ts",
  workers: 1,
  fullyParallel: false,
  globalTeardown: "./tests/fixtures/formula-year-postgres.mjs",
  reporter: "list",
  use: { baseURL: "http://localhost:3005", trace: "retain-on-failure" },
  projects: [{ name: "formula-years", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node tests/fixtures/formula-year-server.mjs",
    url: "http://localhost:3005/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
