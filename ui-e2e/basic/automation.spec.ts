// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/AutomationTest.java
import { test, expect } from "../fixtures";
import {
  clickMenu,
  clickUserMenu,
  waitRestComplete,
  waitTableElements,
  clickPopupMenu,
  retry,
  createUserUI,
} from "../helpers/ui";

test.describe("AutomationTest", () => {
  test("testRecordingCreateAndDeleteUsers – recording captures exactly 1 PUT and 1 DELETE", async ({
    restPage: page,
  }) => {
    // Open automation menu and reset recording state
    await clickUserMenu(page, "automation");
    await page.evaluate(() => {
      sessionStorage.removeItem("nuodbaas-webui-recorded");
      sessionStorage.removeItem("nuodbaas-webui-isRecording");
    });

    // Start recording
    await page.getByTestId("btnStartRecording").click();

    // Create and then delete a user (these actions will be recorded)
    const userName = await createUserUI(page);
    await clickMenu(page, "users");

    const menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      userName,
      "$ref",
    );
    expect(menuCells.length).toBe(1);
    await clickPopupMenu(page, menuCells[0], "delete_button");
    await page.getByTestId("dialog_button_yes").click();
    await waitRestComplete(page);

    // Stop recording
    await retry(async () => {
      await clickUserMenu(page, "automation");
      await page.locator("[data-testid=btnStopRecording][variant=contained]").click();
    });

    // Validate the recorded operations
    const raw = await page.evaluate(() =>
      sessionStorage.getItem("nuodbaas-webui-recorded"),
    );
    expect(raw).not.toBeNull();
    const items = JSON.parse(raw!);
    let puts = 0;
    let deletes = 0;
    for (const item of items) {
      const method = (item.method as string).toUpperCase();
      if (method === "PUT") puts++;
      if (method === "DELETE") deletes++;
    }
    expect(puts).toBe(1);
    expect(deletes).toBe(1);
  });
});
