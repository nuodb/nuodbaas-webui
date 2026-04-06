// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from .env.local if it exists.
 * This lets you set E2E_ORG, E2E_USERNAME, E2E_PASSWORD locally
 * without committing credentials.
 */

export default defineConfig({
  testDir: "./",
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use */
  reporter: [['list'],['html', { outputFolder: 'target/playwright-report' }]],
  use: {
    /* Base URL */
    baseURL: "http://localhost",
    /* Collect trace on first retry */
    trace: "on-first-retry",
    /* Screenshot on failure */
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: 'setup coverage',
      testMatch: /helpers\/global\.setup\.ts/,
      teardown: "teardown coverage",
    },
    {
      name: 'teardown coverage',
      testMatch: /helpers\/global\.teardown\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ['setup coverage'],
    },
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],
});
