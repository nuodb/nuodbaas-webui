// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from .env.local if it exists.
 * This lets you set E2E_BASE_URL, E2E_ORG, E2E_USERNAME, E2E_PASSWORD locally
 * without committing credentials.
 */

export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use */
  reporter: process.env.CI ? "github" : "html",
  use: {
    /* Base URL – override with E2E_BASE_URL env var if the app runs elsewhere */
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    /* Collect trace on first retry */
    trace: "on-first-retry",
    /* Screenshot on failure */
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  /* Start the Vite dev server before running tests unless E2E_BASE_URL is set */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: "http://localhost:3000/ui",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
