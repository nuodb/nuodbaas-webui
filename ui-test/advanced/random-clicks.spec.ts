// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/advanced/RandomClicks.java
import { test } from "../fixtures";
import { clickMenu } from "../helpers/ui";
import {
  createProjectRest,
  createDatabaseRest,
  createBackupRest,
} from "../helpers/api";
import { expect } from "@playwright/test";

/** Left-menu items expected to be clickable – mirrors BannerTest.expectedMenuItems. */
const MENU_ITEMS = [
  "backuppolicies",
  "backups",
  "databases",
  "projects",
  "users",
];

test.describe("RandomClicks", () => {
  test.setTimeout(45_000);
  test("testRandomClicks – rapid random navigation must not trigger global error boundary", async ({
    restPage: page,
  }) => {
    // Create 3 sets of project + database + backup so lists have content
    for (let i = 0; i < 3; i++) {
      const project = await createProjectRest();
      const database = await createDatabaseRest(project);
      await createBackupRest(project, database);
    }

    // Randomly click menu items for 30 seconds
    const end = Date.now() + 30_000;
    while (Date.now() < end) {
      const item = MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)];
      await clickMenu(page, item);
    }

    // If the Global Error Boundary fired, an "error-message" element would be visible.
    // Playwright will also fail if any uncaught exception is thrown with page.on('pageerror').
    // Simply verify no error message appeared.
    await expect(page.getByTestId("error-message")).not.toBeVisible();
  });
});
