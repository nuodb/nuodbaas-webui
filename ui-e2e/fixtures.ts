// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
import { test as base, expect, type Page } from "@playwright/test";
import {
  cleanupResources,
  getCredentials,
  TEST_ORGANIZATION,
  TEST_ADMIN_USER,
  TEST_ADMIN_PASSWORD,
} from "./helpers/api";
import { waitRestComplete } from "./helpers/ui";
const fs = require("fs");

// ---------------------------------------------------------------------------
// Environment-based credentials for UI login tests (may differ from API creds)
// ---------------------------------------------------------------------------
export const E2E_ORG = process.env.E2E_ORG ?? TEST_ORGANIZATION;
export const E2E_USER = process.env.E2E_USER ?? TEST_ADMIN_USER;
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? TEST_ADMIN_PASSWORD;

// Re-export for convenience in test files
export { TEST_ORGANIZATION, TEST_ADMIN_USER, TEST_ADMIN_PASSWORD };

// ---------------------------------------------------------------------------
// Login helpers
// ---------------------------------------------------------------------------

/**
 * Logs in via the UI login form (org, username, password fields).
 * Handles the optional "Show Login" button that appears when SSO providers
 * are configured (mirrors SeleniumTestHelper.login()).
 */
export async function loginViaUI(
  page: Page,
  org = E2E_ORG,
  user = E2E_USER,
  password = E2E_PASSWORD,
): Promise<void> {
  await page.goto("/ui/login");
  waitRestComplete(page);

  const showLoginBtn = page.getByTestId("show_login_button");
  await showLoginBtn.waitFor({ state: "visible", timeout: 3_000 });
  await showLoginBtn.click();

  await page.getByTestId("organization").locator("input").fill(org);
  await page.getByTestId("username").locator("input").fill(user);
  await page.getByTestId("password").locator("input").fill(password);
  await page.getByTestId("login_button").click();
  await page.waitForURL(/\/ui(?!\/login)/, { timeout: 15_000 });
}

/**
 * Logs in via REST API (no UI interaction): POSTs to /login, stores the JWT
 * in localStorage["credentials"], then navigates to /ui/.
 * Mirrors TestRoutines.loginRest().
 */
export async function loginRest(
  page: Page,
  org = TEST_ORGANIZATION,
  user = TEST_ADMIN_USER,
  password = TEST_ADMIN_PASSWORD,
): Promise<void> {
  const creds = await getCredentials(org, user, password);
  // Navigate to /ui/ first so we can set localStorage on the right origin
  await page.goto("/ui/");
  await page.evaluate((c) => {
    localStorage.clear();
    localStorage.setItem("credentials", JSON.stringify(c));
  }, creds);
  await page.goto("/ui/");
  await page.waitForURL(/\/ui(?!\/login)/, { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Extended test fixtures
// ---------------------------------------------------------------------------

type Fixtures = {
  /** Page authenticated via UI login form. */
  authedPage: Page;
  /** Page authenticated via REST (localStorage) + after-each REST cleanup. */
  restPage: Page;
  coverageHook: void;
};

export const test = base.extend<Fixtures>({
    coverageHook: [
      async ({page}, use) => {
        await page.coverage.startJSCoverage();

        await use();

        let coverage = await page.coverage.stopJSCoverage();
        fs.mkdirSync("target/coverage-data", {recursive: true});
        fs.writeFileSync("target/coverage-data/" + (Date.now()/1000) + ".json", JSON.stringify(coverage, null, 2));
      },
      { auto: true },
    ],
    authedPage: async ({ page }, use) => {
      await loginViaUI(page);
      await use(page);
    },

    restPage: async ({ page }, use) => {
      await loginRest(page);
      await use(page);
      // Clean up all non-keep, non-admin resources created during the test
      await cleanupResources();
    },
});

export { expect };
