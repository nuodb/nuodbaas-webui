// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/SettingsTest.java
import { test } from "../fixtures";
import { clickUserMenu } from "../helpers/ui";

test.describe("SettingsTest", () => {
  test("testCancelSave – opening settings twice shows cancel then save", async ({
    restPage: page,
  }) => {
    // First open: cancel button visible
    await clickUserMenu(page, "settings");
    await page.getByTestId("button.cancel").waitFor({ state: "visible" });

    // Second open (settings is still a route, click again): save button visible
    await clickUserMenu(page, "settings");
    await page.getByTestId("button.save").waitFor({ state: "visible" });
  });
});
