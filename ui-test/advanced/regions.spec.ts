// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import { test } from "../fixtures";
import {
  clickMenu,
  clickPopupMenu,
  waitRestComplete,
  waitTableElements,
  retry,
  createUserUI,
} from "../helpers/ui";
import {
  shortUnique,
} from "../helpers/api";
import { expect, TestInfo, type Page } from "@playwright/test";

async function createAndDeleteUser(page: Page) {
    // check REST API is still functional by creating and deleting a user
    const userName = await createUserUI(page);
    await clickMenu(page, "projects");
    await clickMenu(page, "users");

    // Delete User via popup menu
    await retry(async () => {
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
    });
    await waitRestComplete(page);

}

test.describe("Region Selector Tests", () => {

  test("CRUD tests", async ({
    restPage: page,
  }) => {
    await page.goto("/ui/region-selector-settings");

    // open and cancel "Add Region Entry" dialog
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByTestId('button.cancel').click();

    // create custom region with default values
    const defaultLabel = shortUnique("d");
    await page.getByRole('button', { name: 'Add' }).click();
    await page.locator('input[name="name"]').fill(defaultLabel);
    await page.locator('input[name="cp"]').fill('/api');
    await page.locator('input[name="sql"]').fill('/api/sql');
    await page.getByTestId('button.add').click();

    // make active
    await page.getByTestId("make-active-" + defaultLabel).click();

    //verify REST service is still functional by creating/deleting a user
    await createAndDeleteUser(page);

    await page.goto("/ui/region-selector-settings");

    // delete newly created entry
    await page.getByRole('button', { name: defaultLabel }).click();
    await page.locator('input[name="name"]').waitFor({ state: "visible" });
    await page.getByTestId('button.delete').click();
  });

  test("test invalid URL's", async ({
    restPage: page,
  }) => {
    await page.goto("/ui/region-selector-settings");

    // create custom region with invalid values
    const defaultLabel = shortUnique("d");
    await page.getByRole('button', { name: 'Add' }).click();
    await page.locator('input[name="name"]').fill(defaultLabel);
    await page.locator('input[name="cp"]').fill('/api-invalid');
    await page.locator('input[name="sql"]').fill('/api-invalid/sql');
    await page.getByTestId('button.add').click();

    // the error message should show up twice (for the "cp" and "sql" fields)
    await expect(page.getByText('Unable to connect: AxiosError: Request failed with status code 404')).toHaveCount(2);
  });
});
