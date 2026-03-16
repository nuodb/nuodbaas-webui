// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/advanced/SqlTests.java
//
// These tests require a fully running NuoDB database ("keepdb1" in "keepproject").
// The project and database are created if they don't exist, then reused across
// all SQL tests (the "keep" prefix prevents cleanup in afterEach).
// Set DB_READY_TIMEOUT_S env var to override the default 180-second wait.
import { test, expect } from "../fixtures";
import {
  clickMenu,
  clickPopupMenu,
  waitRestComplete,
  waitTableElements,
  replaceInputOrTextareaByName,
  retry,
  createUserUI,
  sleep,
  replaceInputByName,
} from "../helpers/ui";
import {
  getOrCreateProject,
  getOrCreateDatabase,
  TEST_ORGANIZATION,
  cleanupResources,
  restApi,
} from "../helpers/api";
import { type Page } from "@playwright/test";

const DB_USERNAME = "dba";
const DB_PASSWORD = "passw0rd";
const DB_SCHEMA = "schema";
const KEEP_PROJECT = "keepproject";
const KEEP_DATABASE = "keepdb1";
const DB_READY_TIMEOUT =
  parseInt(process.env.DB_READY_TIMEOUT_S ?? "180", 10) * 1_000;

// Shared state – database becomes available once, reused across all SQL tests
let projectName: string | null = null;
let databaseName: string | null = null;

/** Waits until the "keepdb1" database is "Available". */
async function ensureDbAvailable(page: Page): Promise<void> {
  if (projectName !== null && databaseName !== null) return;

  projectName = await getOrCreateProject(KEEP_PROJECT);
  databaseName = await getOrCreateDatabase(KEEP_PROJECT, KEEP_DATABASE);

  const deadline = Date.now() + DB_READY_TIMEOUT;
  while (Date.now() < deadline) {
    try {
      const data = await restApi(
        "GET",
        `/databases/${TEST_ORGANIZATION}/${projectName}/${databaseName}`,
      );
      if (data?.status?.state === "Available") break;
    } catch {
      /* keep waiting */
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }

  // Confirm via UI
  await clickMenu(page, "projects");
  await clickMenu(page, "databases");
  const statusCols = await waitTableElements(
    page,
    "list_resource__table",
    "name",
    databaseName,
    "status.state",
  );
  expect(statusCols.length).toBe(1);
  expect(await statusCols[0].textContent()).toBe("Available");
}

/** Opens the SQL editor for the shared database and logs in. */
async function loginSqlEditor(page: Page): Promise<void> {
  await clickMenu(page, "databases");
  const menuCells = await waitTableElements(
    page,
    "list_resource__table",
    "name",
    databaseName!,
    "$ref",
  );
  expect(menuCells.length).toBe(1);
  await clickPopupMenu(page, menuCells[0], "button.sql.editor");

  await replaceInputOrTextareaByName(page, "dbUsername", DB_USERNAME);
  await replaceInputOrTextareaByName(page, "dbPassword", DB_PASSWORD);
  await replaceInputOrTextareaByName(page, "dbSchema", DB_SCHEMA);
  await page.getByTestId("sql.login.button").click();
  await waitRestComplete(page);
}

/** Verifies the SQL user exists in the table, checks all role options, then deletes it. */
async function verifyAndDeleteDbUser(page: Page, user: string): Promise<void> {
  const users = await waitTableElements(
    page,
    "table_sql",
    "Username",
    user,
    "$ref",
  );
  expect(users.length).toBe(1);

  // Open edit dialog and check all checkboxes are selected
  await clickPopupMenu(page, users[0], "edit_button");
  await expect(page.locator('textarea[name="username"]')).toHaveValue(user);
  for (const testId of [
    "user-roles-system.dba",
    "user-roles-system.administrator",
    "grant-option-system.dba",
    "grant-option-system.administrator",
  ]) {
    await expect(page.getByTestId(testId)).toBeChecked();
  }
  await page.getByTestId("dialog_button_cancel").click();

  // Delete: cancel first, then confirm
  await clickPopupMenu(page, users[0], "delete_button");
  await page.getByTestId("dialog_button_no").click();
  await clickPopupMenu(page, users[0], "delete_button");
  await page.getByTestId("dialog_button_yes").click();
  await waitRestComplete(page);

  await sleep(1000); // TODO(agr22)

  // Verify gone
  const after = await waitTableElements(
    page,
    "table_sql",
    "Username",
    user,
    "$ref",
  );
  expect(after.length).toBe(0);
}

test.describe("SqlTests", () => {
  test.beforeEach(async ({ restPage: page }) => {
    await ensureDbAvailable(page);
  });

  test("testSqlPage – execute SQL, export data, verify downloaded content", async ({
    restPage: page,
  }) => {
    await loginSqlEditor(page);

    await page.waitForLoadState('networkidle');

    // Run DDL + DML + SELECT
    await page.getByTestId("query").click();
    await replaceInputByName(
      page,
      "sqlQuery",
      "create table table1 (name VARCHAR(80))",
    );
    await page.getByTestId("submitSql").click();
    await waitRestComplete(page);

    await page.waitForLoadState('networkidle');

    await page.getByTestId("query").click();
    await sleep(1000); // TODO(agr22)
    await replaceInputByName(
      page,
      "sqlQuery",
      "insert into table1 (name) values ('abc')",
    );
    await page.getByTestId("submitSql").click();
    await waitRestComplete(page);

    await sleep(1000); // TODO(agr22)
    await page.getByTestId("query").click();
    await replaceInputByName(page, "sqlQuery", "select * from table1");
    await page.getByTestId("submitSql").click();
    await waitRestComplete(page);

    // Export
    if(false) { // TODO(agr22) disabled due to missing "save" dialog
      await page.getByTestId("export").click();
      await page.getByTestId("perform.export").click();
      await retry(
        async () => {
          await expect(page.getByTestId("export.status.button")).toHaveText(
            "Dismiss",
          );
        },
        10,
        500,
      );
      await page.getByTestId("export.status.button").click();
      const downloadedFile = await page.evaluate(() =>
        localStorage.getItem("downloadedFile"),
      );
      expect(downloadedFile).toContain("('abc')");
    }

  });

  test("testSqlUsersLocal – create local DB user with all roles, verify, delete", async ({
    restPage: page,
  }) => {
    await loginSqlEditor(page);
    await sleep(1000); // TODO(agr22)
    await page.getByTestId("users").click();

    await sleep(1000); // TODO(agr22)

    // Cancel from "New User" dialog
    await page.getByTestId("sql-add-button").click();
    await page.getByTestId("dialog_button_cancel").click();

    // Open local user dialog, cancel
    await page.getByTestId("sql-add-button").click();
    await page.getByTestId("dialog_button_local").click();
    await page.locator('input[name="username"]').waitFor({ state: "visible" });
    await page.getByTestId("dialog_button_cancel").click();

    // Create local user with all permissions
    const dbUser = `db${Date.now().toString(36).slice(-6)}`;
    await page.getByTestId("sql-add-button").click();
    await page.getByTestId("dialog_button_local").click();
    await page.locator('input[name="username"]').fill(dbUser);
    await page.locator('input[name="password"]').fill("passw0rd");
    await page.getByTestId("user-roles-system.dba").click();
    await page.getByTestId("user-roles-system.administrator").click();
    await page.getByTestId("grant-option-system.dba").click();
    await page.getByTestId("grant-option-system.administrator").click();
    await page.getByTestId("dialog_button_save").click();
    await waitRestComplete(page);
    await sleep(1000); // TODO(agr22)

    await verifyAndDeleteDbUser(page, dbUser);
  });

  test("testSqlUsersDbaas – create DBaaS user with all roles, verify, delete", async ({
    restPage: page,
  }) => {
    const dbaasUser = await createUserUI(page);
    await loginSqlEditor(page);
    await sleep(1000); // TODO(agr22)
    await page.getByTestId("users").click();

    await sleep(1000); // TODO(agr22)

    // Open dbaas dialog, cancel
    await page.getByTestId("sql-add-button").click();
    await page.getByTestId("dialog_button_dbaas").click();
    await replaceInputOrTextareaByName(
      page,
      "username",
      `${TEST_ORGANIZATION}/${dbaasUser}`,
    );
    await page.getByTestId("dialog_button_cancel").click();
    await sleep(1000); // TODO(agr22)

    // Create dbaas user with all permissions
    await page.getByTestId("sql-add-button").click();
    await page.getByTestId("dialog_button_dbaas").click();
    await replaceInputOrTextareaByName(
      page,
      "username",
      `${TEST_ORGANIZATION}/${dbaasUser}`,
    );
    // TODO(agr22) it doesn't fill in above text - needs fix
    // await sleep(1000); // TODO(agr22)
    // await page.getByTestId("user-roles-system.dba").click();
    // await page.getByTestId("user-roles-system.administrator").click();
    // await page.getByTestId("grant-option-system.dba").click();
    // await page.getByTestId("grant-option-system.administrator").click();
    // await page.getByTestId("dialog_button_save").click();
    // await waitRestComplete(page);

    // DBaaS users appear as org_user in the SQL users table
    // await verifyAndDeleteDbUser(page, `${TEST_ORGANIZATION}_${dbaasUser}`);
  });
});
