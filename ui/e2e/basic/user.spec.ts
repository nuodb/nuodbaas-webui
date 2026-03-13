// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/UserTest.java
import { test, expect } from "../fixtures";
import {
  clickMenu,
  clickPopupMenu,
  waitRestComplete,
  waitTableElements,
  replaceInputByName,
  hasElement,
  retry,
  createUserUI,
  createProjectUI,
  createDatabaseUI,
  getInputOrTextareaByName,
} from "../helpers/ui";
import {
  createProjectRest,
  createDatabaseRest,
  TEST_ORGANIZATION,
} from "../helpers/api";

test.describe("UserTest", () => {
  test("testCreateUser", async ({ restPage: page }) => {
    await createUserUI(page);
  });

  test("testCreateUserWithDifferentOrg – keyboard tab navigation + confirm dialog", async ({
    restPage: page,
  }) => {
    // Navigate to user creation form
    await clickMenu(page, "users");
    await page.getByTestId("list_resource__create_button_users").click();

    // Keyboard nav: go to Access Control tab and back
    await page.getByTestId("section-0").press("ArrowRight");
    await page
      .locator('[id="accessRule.allow.0"]')
      .waitFor({ state: "visible" });
    await page
      .getByTestId("section-title-access-deny-rules")
      .press("ArrowLeft");
    await page.locator('input[name="name"]').waitFor({ state: "visible" });

    // Fill form
    const name = `u${Date.now().toString(36).slice(-6)}`;
    await replaceInputByName(page, "organization", TEST_ORGANIZATION);
    await replaceInputByName(page, "name", name);
    await replaceInputByName(
      page,
      "password",
      process.env.TEST_ADMIN_PASSWORD ?? "passw0rd",
    );

    // Open access rules section and fill two allow rules
    await page.getByTestId("section-title-access-deny-rules").click();
    await replaceInputByName(
      page,
      "accessRule.allow.0",
      `all:${TEST_ORGANIZATION}`,
    );
    await replaceInputByName(
      page,
      "accessRule.allow.1",
      `all:${TEST_ORGANIZATION}2`,
    );

    // Save → "different org" dialog → cancel → save → accept
    await page.getByTestId("create_resource__create_button").click();
    await page.getByTestId("dialog_button_no").click();
    await page.getByTestId("create_resource__create_button").click();
    await page.getByTestId("dialog_button_yes").click();
    await waitRestComplete(page);

    await page
      .getByTestId("list_resource__table")
      .waitFor({ state: "visible" });
  });

  test("testListCreateAndDeleteUsers", async ({ restPage: page }) => {
    const userName = await createUserUI(page);
    await clickMenu(page, "users");

    // Delete via popup menu
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
    // Verify gone
    await retry(async () => {
      const cells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        userName,
        "$ref",
      );
      expect(cells.length).toBe(0);
    });
  });

  test("testEditUser – add label and verify", async ({ restPage: page }) => {
    const userName = await createUserUI(page);
    await clickMenu(page, "users");

    await retry(async () => {
      const menuCells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        userName,
        "$ref",
      );
      expect(menuCells.length).toBe(1);
      await clickPopupMenu(page, menuCells[0], "edit_button");
    });

    // organization and name must be disabled in edit mode
    for (const fieldName of ["organization", "name"]) {
      await expect(await getInputOrTextareaByName(page, fieldName)).toBeDisabled();
    }

    // Add label
    await page.getByTestId("section-title-labels").click();
    await page.locator('input[name="labels.0.key"]').fill(userName);
    await page.locator('input[name="labels.0.value"]').fill(userName);
    await page.getByTestId("create_resource__save_button").click();
    await waitRestComplete(page);

    // Verify label cell
    await retry(async () => {
      const labelCells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        userName,
        "labels",
      );
      expect(labelCells.length).toBe(1);
      const text = await labelCells[0].textContent();
      expect(text).toContain(`${userName}: ${userName}`);
    });
  });

  test("testEditUserRoles – database-admin role params", async ({
    restPage: page,
  }) => {
    const projectName = await createProjectRest();
    const databaseName = await createDatabaseUI(page, projectName);
    const userName = await createUserUI(page);
    await clickMenu(page, "users");

    await retry(async () => {
      const menuCells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        userName,
        "$ref",
      );
      expect(menuCells.length).toBe(1);
      await clickPopupMenu(page, menuCells[0], "edit_button");
    });

    // Expand Advanced section and set role
    await page.getByTestId("section-title-advanced").click();
    await replaceInputByName(page, "roles.0.name", "database-admin");

    // Fill role params – read key from UI, set matching value
    const paramKeys = ["database", "organization", "project"];
    for (let i = 0; i < paramKeys.length; i++) {
      const keyInput = await getInputOrTextareaByName(page, `roles.0.params.${i}.key`);
      await keyInput.waitFor({ state: "visible" });
      const key = await keyInput.inputValue();
      let value = TEST_ORGANIZATION;
      if (key === "database") value = databaseName;
      else if (key === "project") value = projectName;
      await page.locator(`input[name="roles.0.params.${i}.value"]`).fill(value);
    }

    await page.getByTestId("create_resource__save_button").click();
    await waitRestComplete(page);

    // Verify roles cell
    await retry(async () => {
      const rolesCells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        userName,
        "roles",
      );
      expect(rolesCells.length).toBe(1);
      const text = (await rolesCells[0].textContent()) ?? "";
      expect(text).toContain("database-admin");
      expect(text).toContain(databaseName);
      expect(text).toContain(projectName);
      expect(text).toContain(TEST_ORGANIZATION);
    });
  });

  test("testColumnSorter – keyboard navigation on column sort headers", async ({
    restPage: page,
  }) => {
    await clickMenu(page, "users");
    // Click the $ref (menu) column header to trigger sort UI
    await page.getByTestId("$ref").click();
    // Keyboard navigation on sort dropdowns
    await page.locator('div[id="accessRule.deny"]').press("ArrowUp");
    await page.locator('div[id="accessRule"]').press("ArrowDown");
  });
});
