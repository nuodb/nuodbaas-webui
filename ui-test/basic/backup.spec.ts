// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/BackupTest.java
import { test } from "../fixtures";
import {
  clickPopupMenu,
  waitRestComplete,
  waitTableElements,
  retry,
  createBackupUI,
  sleep,
  clickMenu,
} from "../helpers/ui";
import {
  createProjectRest,
  createDatabaseRest,
} from "../helpers/api";
import { expect } from "@playwright/test";

test.describe("BackupTest", () => {
  test("testCreateBackup", async ({ restPage: page }) => {
    const projectName = await createProjectRest();
    const databaseName = await createDatabaseRest(projectName);
    await sleep(100); // TODO(agr22)
    const backupName = await createBackupUI(page, projectName, databaseName);

    const rows = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      backupName,
      "name",
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test("testListCreateAndDeleteBackups", async ({ restPage: page }) => {
    const projectName = await createProjectRest();
    const databaseName = await createDatabaseRest(projectName);
    const backupName = await createBackupUI(page, projectName, databaseName);

    await sleep(100); // TODO(agr22)
    await clickMenu(page, "backups");
    await sleep(100); // TODO(agr22)

    const menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      backupName,
      "$ref",
    );
    expect(menuCells.length).toBe(1);
    await clickPopupMenu(page, menuCells[0], "delete_button");
    await page.getByTestId("dialog_button_yes").click();

    await waitRestComplete(page);

    await sleep(100); // TODO(agr22)
    const cells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      backupName,
      "$ref",
    );
    expect(cells.length).toBe(0);
  });

  test("testEditBackup – add label and verify", async ({ restPage: page }) => {
    const projectName = await createProjectRest();
    const databaseName = await createDatabaseRest(projectName);
    const backupName = await createBackupUI(page, projectName, databaseName);

    const menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      backupName,
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
        backupName,
        "labels",
      );
      expect(labelCells.length).toBe(1);
      const text = await labelCells[0].textContent();
      expect(text).toContain(`${projectName}: ${databaseName}`);
    });
  });
});
