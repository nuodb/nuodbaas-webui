// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/ListResourceTest.java
import { expect } from "@playwright/test";
import { test } from "../fixtures";
import {
  clickMenu,
  waitRestComplete,
  waitTableElements,
  retry,
  createUserUI,
  sleep,
} from "../helpers/ui";

test.describe("ListResourceTest", () => {
  test("testDeleteMultipleUsers – multi-select delete with No/Yes confirmation", async ({
    restPage: page,
  }) => {
    // Create two users
    const userNames = [await createUserUI(page), await createUserUI(page)];
    await clickMenu(page, "users");

    // Check both users' checkboxes
    for (const userName of userNames) {
      await retry(async () => {
        const checkCells = await waitTableElements(
          page,
          "list_resource__table",
          "0",
          userName,
          "0",
        );
        expect(checkCells.length).toBe(1);
        await checkCells[0].locator("input[type='checkbox']").click();
      });
    }

    // Click multi-delete, choose No → users must still be there
    await page.getByTestId("list_resources_multiple_delete_button").click();
    await page.getByTestId("dialog_button_no").click();

    await waitRestComplete(page);
    await retry(async () => {
      for (const userName of userNames) {
        const cells = await waitTableElements(
          page,
          "list_resource__table",
          "0",
          userName,
          "0",
        );
        expect(cells.length).toBe(1);
      }
    });

    // Click multi-delete, choose Yes → users must be gone
    await page.getByTestId("list_resources_multiple_delete_button").click();
    await page.getByTestId("dialog_button_yes").click();

    await waitRestComplete(page);
    await sleep(100);
    await retry(async () => {
      for (const userName of userNames) {
        const cells = await waitTableElements(
          page,
          "list_resource__table",
          "0",
          userName,
          "0",
        );
        expect(cells.length).toBe(0);
      }
    });
  });
});
