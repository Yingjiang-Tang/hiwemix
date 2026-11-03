import { defineConfig, devices } from "@playwright/test";

process.env.TONER_TEST_BACKEND = "http://127.0.0.1:54330";
process.env.TONER_TEST_RUN_ID ??= String(Date.now());
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "toner-website.spec.ts",
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  globalTeardown: "./tests/fixtures/toner-postgres.mjs",
  reporter: "list",
  use: { baseURL: "http://localhost:3006", trace: "retain-on-failure" },
  projects: [{ name: "toner-website", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node tests/fixtures/toner-website-server.mjs",
    url: "http://localhost:3006/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
