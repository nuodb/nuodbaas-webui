// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/BannerTest.java
import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { hasMenu, clickUserMenu, waitRestComplete } from "./helpers/ui";

/** All left-menu items expected to appear for an admin user. */
const EXPECTED_MENU_ITEMS = [
  "backuppolicies",
  "backups",
  "databases",
  "projects",
  "users",
];

test.describe("BannerTest", () => {
  test("testMenuBanner – all expected menu items are visible", async ({
    restPage: page,
  }) => {
    for (const item of EXPECTED_MENU_ITEMS) {
      await hasMenu(page, item);
    }
  });

  test("logout via user menu returns to login page", async ({
    restPage: page,
  }) => {
    await clickUserMenu(page, "logout");
    await expect(page).toHaveURL(/\/ui\/login/);
  });
});

export { EXPECTED_MENU_ITEMS };
