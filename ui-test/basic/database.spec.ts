// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/DatabaseTest.java
import { test } from "../fixtures";
import {
  clickMenu,
  clickPopupMenu,
  waitRestComplete,
  waitTableElements,
  replaceInputOrTextareaByName,
  hasPopupMenu,
  retry,
  createDatabaseUI,
  sleep,
} from "../helpers/ui";
import {
  createProjectRest,
  createDatabaseRest,
} from "../helpers/api";
import { expect } from "@playwright/test";

test.describe("DatabaseTest", () => {
  test("testCreateDatabase", async ({ restPage: page }) => {
    const projectName = await createProjectRest();
    await createDatabaseUI(page, projectName);

    const rows = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      null,
      "name",
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test("testListCreateAndDeleteDatabases", async ({ restPage: page }) => {
    const projectName = await createProjectRest();
    const databaseName = await createDatabaseUI(page, projectName);

    await retry(async () => {
      const menuCells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        databaseName,
        "$ref",
      );
      expect(menuCells.length).toBe(1);
      await clickPopupMenu(page, menuCells[0], "delete_button");
      await page.getByTestId("dialog_button_yes").click();
    });

    await waitRestComplete(page);
    await retry(async () => {
      const cells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        databaseName,
        "$ref",
      );
      expect(cells.length).toBe(0);
    });
  });

  test("testEditDatabase – add label and verify", async ({
    restPage: page,
  }) => {
    const projectName = await createProjectRest();
    const databaseName = await createDatabaseRest(projectName);

    await clickMenu(page, "databases");
    const menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      databaseName,
      "$ref",
    );
    expect(menuCells.length).toBe(1);
    await clickPopupMenu(page, menuCells[0], "edit_button");

    await page.getByTestId("section-title-advanced").click();
    await page.locator('input[name="labels.0.key"]').fill(projectName);
    await page.locator('input[name="labels.0.value"]').fill(databaseName);
    await page.getByTestId("create_resource__save_button").click();
    await waitRestComplete(page);

    await retry(async () => {
      const labelCells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        databaseName,
        "labels",
      );
      expect(labelCells.length).toBe(1);
      const text = await labelCells[0].textContent();
      expect(text).toContain(`${projectName}: ${databaseName}`);
    });
  });

  test("testChangeDatabasePassword", async ({ restPage: page }) => {
    const projectName = await createProjectRest();
    const databaseName = await createDatabaseRest(projectName);

    // Open view mode
    await clickMenu(page, "databases");
    let menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      databaseName,
      "$ref",
    );
    expect(menuCells.length).toBe(1);
    await clickPopupMenu(page, menuCells[0], "view_button");

    // Open change-password dialog, cancel
    await sleep(100); //TODO(agr22) wait for page to fully render
    page.getByTestId("resource-popup-menu").click();
    await page.getByTestId("popupmenu-button.db.changeDbaPassword").click();
    await page.getByTestId("button.cancel").click();

    // Change password to "db1"
    let popupMenu = page.getByTestId("resource-popup-menu");
    await popupMenu.waitFor({state: "visible"});
    popupMenu.click();
    await page.getByTestId("popupmenu-button.db.changeDbaPassword").click();
    await page.locator('input[name="oldPassword"]').fill("passw0rd");
    await page.locator('input[name="newPassword1"]').fill("db1");
    await page.locator('input[name="newPassword2"]').fill("db1");
    await page.getByTestId("button.changePassword").click();
    await waitRestComplete(page);

    // Change password back to "passw0rd" from the list view popup menu
    await clickMenu(page, "databases");
    menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      databaseName,
      "$ref",
    );
    expect(menuCells.length).toBe(1);
    await clickPopupMenu(page, menuCells[0], "button.db.changeDbaPassword");
    await page.locator('input[name="oldPassword"]').fill("db1");
    await page.locator('input[name="newPassword1"]').fill("passw0rd");
    await page.locator('input[name="newPassword2"]').fill("passw0rd");
    await page.getByTestId("button.changePassword").click();
    await waitRestComplete(page);

    await page
      .getByTestId("button.changePassword")
      .waitFor({ state: "visible" });
  });

  test("testStartStopDatabase", async ({ restPage: page }) => {
    const projectName = await createProjectRest();
    const databaseName = await createDatabaseRest(projectName);

    // Stop database
    await clickMenu(page, "databases");
    let menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      databaseName,
      "$ref",
    );
    expect(menuCells.length).toBe(1);
    await clickPopupMenu(page, menuCells[0], "confirm.stop.database.title");
    await page.getByTestId("dialog_button_yes").click();
    await waitRestComplete(page);

    page.goto("/ui/");
    await clickMenu(page, "databases");
    const cells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      databaseName,
      "$ref",
    );
    expect(cells.length).toBe(1);
    const status = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      databaseName,
      "status",
    );
    expect(status.length).toBe(1);
    expect(status[0]).toContainText("Shutdown");

    await clickPopupMenu(page, cells[0], "confirm.start.database.title");
    await page.getByTestId("dialog_button_yes").click();
    await waitRestComplete(page);

    // Stop database again (retry) then click No to cancel
    await retry(
      async () => {
        await clickMenu(page, "projects");
        await clickMenu(page, "databases");
        const cells = await waitTableElements(
          page,
          "list_resource__table",
          "name",
          databaseName,
          "$ref",
        );
        expect(cells.length).toBe(1);
        await clickPopupMenu(page, cells[0], "confirm.stop.database.title");
      },
      60,
      1_000,
    );
    await page.getByTestId("dialog_button_no").click();
    await waitRestComplete(page);
  });

  test("testDatabaseViewPopupMenu – popup menu items visible and functional", async ({
    restPage: page,
  }) => {
    const projectName = await createProjectRest();
    const databaseName = await createDatabaseRest(projectName);
    waitRestComplete(page);

    await clickMenu(page, "databases");
    let menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      databaseName,
      "$ref",
    );
    expect(menuCells.length).toBe(1);

    // Open view, cancel immediately
    await clickPopupMenu(page, menuCells[0], "view_button");
    await page.getByTestId("create_resource__close_button").click();

    // Open view again
    menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      databaseName,
      "$ref",
    );
    await clickPopupMenu(page, menuCells[0], "view_button");

    // Click Edit button inside view → save/cancel visible
    await page.getByTestId("edit_button").click();
    await page
      .getByTestId("create_resource__save_button")
      .waitFor({ state: "visible" });
    await page.getByTestId("create_resource__cancel_button").click();

    // Popup menu: Edit
    await page.getByTestId("resource-popup-menu").click();
    await page.getByTestId("popupmenu-edit_button").click();
    await page.getByTestId("create_resource__cancel_button").click();

    // Popup menu: Delete → No
    await page.getByTestId("resource-popup-menu").click();
    await page.getByTestId("popupmenu-delete_button").click();
    await page.getByTestId("dialog_button_no").click();

    // Popup menu: Connection Info
    await page.getByTestId("resource-popup-menu").click();
    await page.getByTestId("popupmenu-button.db.connection.info").click();
    await page.getByTestId("copy-Certificate").click();
    await page.getByTestId("copy-SQL Endpoint").click();
    await page.getByTestId("copy-Database").click();
    await page.getByTestId("dialog_button_ok").click();

    // Popup menu: Stop → No
    await page.getByTestId("resource-popup-menu").click();
    await page.getByTestId("popupmenu-confirm.stop.database.title").click();
    await page.getByTestId("dialog_button_no").click();

    // Popup menu: SQL Editor – just verify item is visible
    await page.getByTestId("resource-popup-menu").click();
    await page
      .getByTestId("popupmenu-button.sql.editor")
      .waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
  });
});
