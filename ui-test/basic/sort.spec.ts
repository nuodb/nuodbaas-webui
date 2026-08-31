// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
import { test } from "../fixtures";
import {
  clickMenu,
  waitRestComplete,
  waitTableElements,
  replaceInputOrTextareaByName,
  selectMuiCombo,
} from "../helpers/ui";
import {
  createResourceRest,
  shortUnique,
  TEST_ORGANIZATION,
  TEST_ADMIN_PASSWORD,
} from "../helpers/api";
import { expect, Page } from "@playwright/test";

/**
 * Clicks the sort button for a given column.
 * - Clicking the *top* half of the button sorts **ascending**.
 * - Clicking the *bottom* half of the button sorts **descending**.
 *
 * @param columnId  The column identifier used in the test‑id (e.g. "name").
 * @param direction Either "asc" for ascending or "desc" for descending.
 */
async function sortColumn(
  page: Page,
  columnId: string,
  direction: "asc" | "desc",
): Promise<void> {
  let sortButton = page.getByTestId("sortButton_" + columnId);
  const box = await sortButton.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const sort = (await sortButton.getAttribute("data-sort")) as
      | "none"
      | "asc"
      | "desc";
    if (sort === "none" || sort !== direction) {
      await sortButton.click({
        position: {
          x: box.width / 2,
          y: box.height * (direction === "asc" ? 0.25 : 0.75),
        },
      });
    }
  }
}

/**
 * creates `count` users with `u<random name><0-based index`
 * @param count number of users to create
 * @returns `u<random name>` (without index)
 */
async function createUsers(count: number): Promise<string> {
  // Create "count" users (0-based) with labels via REST
  const name = shortUnique("u");
  const labelName = "l" + name.substring(1);

  for (let i = 0; i < count; i++) {
    await createResourceRest("users", `/${TEST_ORGANIZATION}/${name}${i}`, {
      organization: TEST_ORGANIZATION,
      name: `${name}${i}`,
      password: TEST_ADMIN_PASSWORD,
      accessRule: { allow: [`all:${TEST_ORGANIZATION}`] },
      labels: {
        label1: "value1",
        label2: `${labelName}${(i + Math.floor(count / 2)) % count}`, //start label2 with second half and then first half (i.e. with count=5: [2,3,4,0,1]) so it is not sorted the same way as the name field is sorted
      },
    });
  }
  return name;
}

async function searchNameStartsWith(page: Page, search: string) {
  const select = page.locator("#select-search");

  //clear out all search queries
  await select.focus();
  for (let i = 0; i < 10; i++) {
    // assuming we have never more than 10 filters
    await page.keyboard.press("Backspace");
  }

  // set filter
  await select.click();
  await page.getByText("name", { exact: true }).click();
  await selectMuiCombo(page, "condition", "starts with");
  await replaceInputOrTextareaByName(page, "value", search);
  await page.getByTestId("dialog_button_ok").click();
  await waitRestComplete(page);
}

async function expectColumnToBe(
  page,
  column,
  expected: string[],
): Promise<void> {
  const cells = await waitTableElements(
    page,
    "list_resource__table",
    "name",
    null,
    column,
  );
  expect(cells.length).toEqual(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(await cells[i].textContent()).toBe(expected[i]);
  }
}

test.describe("Sorting tests", () => {
  test('tests sorting of "name" and "label.label2" columns', async ({
    restPage: page,
  }) => {
    const nuodbaas_webui_userSettings = {
      views: {
        "/users": {
          columns: [
            "organization",
            "name",
            "labels",
            "roles",
            "accessRule",
            "status",
            "labels.label2", // added this column to the default columns
          ],
        },
      },
    };
    await page.evaluate((userSettings) => {
      localStorage.setItem(
        "nuodbaas_webui_userSettings",
        JSON.stringify(userSettings),
      );
    }, nuodbaas_webui_userSettings);

    const name = await createUsers(5);
    await clickMenu(page, "users");
    await waitRestComplete(page);
    await searchNameStartsWith(page, name);

    // sort by name
    await sortColumn(page, "name", "asc");
    await expectColumnToBe(page, "name", [
      `${name}0`,
      `${name}1`,
      `${name}2`,
      `${name}3`,
      `${name}4`,
    ]);
    await sortColumn(page, "name", "desc");
    await expectColumnToBe(page, "name", [
      `${name}4`,
      `${name}3`,
      `${name}2`,
      `${name}1`,
      `${name}0`,
    ]);

    // sort by labels.label2
    const labelName = "l" + name.substring(1);
    await sortColumn(page, "labels.label2", "asc");
    await expectColumnToBe(page, "labels.label2", [
      `${labelName}0`,
      `${labelName}1`,
      `${labelName}2`,
      `${labelName}3`,
      `${labelName}4`,
    ]);
    await sortColumn(page, "labels.label2", "desc");
    await expectColumnToBe(page, "labels.label2", [
      `${labelName}4`,
      `${labelName}3`,
      `${labelName}2`,
      `${labelName}1`,
      `${labelName}0`,
    ]);

    // sort by name (descending first)
    await sortColumn(page, "name", "desc");
    await expectColumnToBe(page, "name", [
      `${name}4`,
      `${name}3`,
      `${name}2`,
      `${name}1`,
      `${name}0`,
    ]);
    await sortColumn(page, "name", "asc");
    await expectColumnToBe(page, "name", [
      `${name}0`,
      `${name}1`,
      `${name}2`,
      `${name}3`,
      `${name}4`,
    ]);
  });
});
