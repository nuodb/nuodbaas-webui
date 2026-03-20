// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
import { test as base, type Page } from "@playwright/test";
import {
  cleanupResources,
} from "./helpers/api";
import { loginRest, loginViaUI } from "./helpers/ui";
const fs = require("fs");

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
