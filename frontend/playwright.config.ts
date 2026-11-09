import { defineConfig } from "@playwright/test";

/**
 * Recette automatisée (docs/PLAN_DE_TESTS_RECETTE.md : R01, R03, R06, R07, R08, R13).
 * Prérequis : backend (http://localhost:4000) et frontend (http://localhost:3000) démarrés, base initialisée
 * (`npm run prisma:seed` côté backend). Variables : E2E_WEB_URL, E2E_API_URL, E2E_PASSWORD.
 *   npm i -D @playwright/test && npx playwright install chromium
 *   npm run e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1, // la recette partage une même base : on évite les écritures concurrentes
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_WEB_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
