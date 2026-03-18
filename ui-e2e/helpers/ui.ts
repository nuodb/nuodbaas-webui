// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
/**
 * UI helper utilities for Playwright tests.
 * Mirrors SeleniumTestHelper.java / TestRoutines.java utility methods.
 */
const fs = require("fs");
import { expect, type Locator, type Page } from "@playwright/test";
import {
  TEST_ADMIN_PASSWORD,
  TEST_ORGANIZATION,
  type Resource,
  shortUnique,
} from "./api";

// ---------------------------------------------------------------------------
// Wait / polling helpers
// ---------------------------------------------------------------------------

/** Waits for the REST spinner "complete" indicator to appear. */
export async function waitRestComplete(
  page: Page,
  timeout = 10_000,
): Promise<void> {
  await page
    .getByTestId("rest_spinner__complete")
    .waitFor({ state: 'hidden', timeout });
}

/**
 * Retries async `fn` up to `count` times waiting `delayMs` between attempts.
 * Mirrors TestRoutines.retry().
 */
export async function retry(
  fn: () => Promise<void>,
  count = 30,
  delayMs = 1_000,
): Promise<void> {
  let last: unknown;
  for (let i = 0; i < count; i++) {
    try {
      await fn();
      return;
    } catch (e) {
      last = e;
      if (i < count - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw last;
}

// ---------------------------------------------------------------------------
// Navigation / menu helpers
// ---------------------------------------------------------------------------

/** Clicks the left-menu button for `resource` and waits for REST to complete. */
export async function clickMenu(page: Page, resource: string): Promise<void> {
  await page.getByTestId(`menu-button-${resource}`).click();
  await sleep(100); // TODO(agr22)
  await waitRestComplete(page);
}

/**
 * Opens a popup by clicking `menuToggle`, then clicks the item with
 * `data-testid={dataTestId}` inside the `menu-popup` container.
 */
export async function clickPopupMenu(
  page: Page,
  menuToggle: Locator,
  dataTestId: string,
): Promise<void> {
  await menuToggle.click();
  await page.getByTestId("menu-popup").getByTestId(dataTestId).click();
}

/** Clicks the `user-menu` element, then the item identified by `dataTestId`. */
export async function clickUserMenu(
  page: Page,
  dataTestId: string,
): Promise<void> {
  await clickPopupMenu(page, page.getByTestId("user-menu"), dataTestId);
}

// ---------------------------------------------------------------------------
// Presence / absence assertions
// ---------------------------------------------------------------------------

export async function hasElement(
  page: Page,
  testId: string,
  timeout = 15_000,
): Promise<void> {
  await page.getByTestId(testId).waitFor({ state: "visible", timeout });
}

export async function hasNotElement(
  page: Page,
  testId: string,
  timeoutMs = 1_000,
): Promise<void> {
  await expect(page.getByTestId(testId)).not.toBeVisible({
    timeout: timeoutMs,
  });
}

export async function hasMenu(page: Page, resource: string): Promise<void> {
  await hasElement(page, `menu-button-${resource}`);
}

export async function hasNotMenu(
  page: Page,
  resource: string,
  timeoutMs = 500,
): Promise<void> {
  await hasNotElement(page, `menu-button-${resource}`, timeoutMs);
}

/**
 * Asserts the popup menu item IS present (closes popup after checking).
 */
export async function hasPopupMenu(
  page: Page,
  menuToggle: Locator,
  dataTestId: string,
): Promise<void> {
  await menuToggle.click();
  await page
    .getByTestId("menu-popup")
    .getByTestId(dataTestId)
    .waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
}

/**
 * Asserts the popup menu item is NOT present (closes popup after checking).
 */
export async function hasNotPopupMenu(
  page: Page,
  menuToggle: Locator,
  dataTestId: string,
): Promise<void> {
  await menuToggle.click();
  await expect(
    page.getByTestId("menu-popup").getByTestId(dataTestId),
  ).not.toBeVisible({ timeout: 1_000 });
  await page.keyboard.press("Escape");
}

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------

export async function getInputOrTextareaByName(page: Page, name: string) {
  let input:Locator = page.locator(`input[name="${name}"]`);
  for(let i=0; i<10; i++) {
    input = page.locator(`input[name="${name}"]`);
    if ((await input.count()) > 0) {
      return input;
    }
    input = page.locator(`textarea[name="${name}"]`);
    if((await input.count()) > 0) {
      return input;
    }
    await sleep(100); // TODO(agr22)
  }
  return input;
}

/**
 * Fills a named input, handling both plain <input> fields and MUI Select
 * components (which render a hidden native input + a visible combobox div).
 * Mirrors TestRoutines.replaceInputElementByName().
 */
export async function replaceInputOrTextareaByName(
  page: Page,
  name: string,
  value: string,
): Promise<void> {
  // MUI Select: a hidden <input class="MuiSelect-nativeInput" name="…"> exists
  const muiHidden = page.locator(`input.MuiSelect-nativeInput[name="${name}"]`);
  if ((await muiHidden.count()) > 0) {
    // Click the visible combobox trigger
    await page
      .locator(
        `[id="${name}"][role="combobox"], [id="${name}"].MuiSelect-select`,
      )
      .first()
      .click();
    // Click the matching listbox option (MUI renders li[data-value="…"])
    await page
      .locator(`ul[role="listbox"] li[data-value="${value}"]`)
      .or(page.getByRole("option", { name: value, exact: true }))
      .first()
      .click();
    return;
  }
  // Regular input
  let input = await getInputOrTextareaByName(page, name);
  input.waitFor({state: "visible", timeout: 10_000});
  if(await input.inputValue() !== value) {
    await input.fill(value);
  }
}

export async function replaceInputByName(
  page: Page,
  name: string,
  value: string,
): Promise<void> {
  let input = await getInputOrTextareaByName(page, name);
  input.waitFor({state: "visible", timeout: 10_000});
  if(await input.inputValue() !== value) {
    await input.fill(value);
  }
}

export async function waitForTestId(page: Page, id: string) {
  let element: Locator = page.getByTestId(id);
  await element.waitFor({ state: "visible", timeout: 10_000 });
  return element;
}

export async function waitForTestIdHidden(page: Page, id: string) {
  let element: Locator = page.getByTestId(id);
  await element.waitFor({ state: "hidden", timeout: 10_000 });
  return element;
}



// ---------------------------------------------------------------------------
// Table helpers
// ---------------------------------------------------------------------------

/**
 * Searches a resource table (identified by `data-testid={tableId}`) for rows
 * where the cell in column `searchColumn` contains `searchValue`, and returns
 * the cells in column `resultColumn`.
 *
 * Column identifiers:
 *   - A string matching the `data-testid` of a `<th>` header (e.g. "name", "$ref")
 *   - A numeric string for 0-based td index (e.g. "0")
 *
 * Mirrors SeleniumTestHelper.waitTableElements().
 */
export async function waitTableElements(
  page: Page,
  tableId: string,
  searchColumn: string,
  searchValue: string | null,
  resultColumn: string,
  timeout = 15_000,
): Promise<Locator[]> {
  const table = page.getByTestId(tableId);
  await table.waitFor({ state: "visible", timeout });

  for(let retry=0; retry<10; retry++) {
    // Build header-testid → column index map
    const headerEls = await table.locator("thead tr th[data-testid]").all();
    const headerIds = await Promise.all(
      headerEls.map((h) => h.getAttribute("data-testid")),
    );

    function tdIndex(colId: string): number {
      if (/^\d+$/.test(colId)) return parseInt(colId, 10);
      const i = headerIds.indexOf(colId);
      return i >= 0 ? i : -1;
    }

    const searchIdx = tdIndex(searchColumn);
    const resultIdx = tdIndex(resultColumn);

    const rows = await table.locator("tbody tr").all();
    const results: Locator[] = [];

    for (const row of rows) {
      const cells = await row.locator("td").all();
      if (searchIdx < 0 || searchIdx >= cells.length) continue;
      const text = (await cells[searchIdx].textContent()) ?? "";
      if (searchValue === null || text.includes(searchValue)) {
        if (resultIdx >= 0 && resultIdx < cells.length) {
          results.push(cells[resultIdx]);
        }
      }
    }

    if (headerEls.length === (await table.locator("thead tr th[data-testid]").all()).length) {
      return results;
    }
    else {
      // DOM was modified while we parsed the table - retry parsing table.
      sleep(50);
    }
  }
  throw Error("Unable to parse table after all retries");
}

// ---------------------------------------------------------------------------
// Resource CRUD via UI (mirrors TestRoutines.createResource / deleteResource)
// ---------------------------------------------------------------------------

/**
 * Creates a resource through the UI form.
 * `fields` is an ordered array of [fieldName, value] pairs (same order the
 * Java code passes them).
 */
export async function createResourceUI(
  page: Page,
  resource: Resource,
  name: string,
  fields: [string, string][],
): Promise<void> {
  await sleep(100); // TODO(agr22)
  await clickMenu(page, resource);
  await sleep(100); // TODO(agr22)
  await page.getByTestId(`list_resource__create_button_${resource}`).click();

  for (const [fieldName, value] of fields) {
    if (fieldName.startsWith("accessRule")) {
      const section = page.getByTestId("section-title-access-deny-rules");
      if (await section.isVisible({ timeout: 500 }).catch(() => false)) {
        await section.click();
      }
    }
    await replaceInputOrTextareaByName(page, fieldName, value);
  }

  await page.getByTestId("create_resource__create_button").click();
  await waitRestComplete(page);
}

export async function deleteResourceUI(
  page: Page,
  resource: Resource,
  name: string,
): Promise<void> {
  await retry(async () => {
    await clickMenu(page, resource);
    const menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      name,
      "$ref",
    );
    expect(menuCells.length).toBe(1);
    await clickPopupMenu(page, menuCells[0], "delete_button");
    await page.getByTestId("dialog_button_yes").click();
  });
}

// ---------------------------------------------------------------------------
// Typed resource factories (UI)
// ---------------------------------------------------------------------------

export async function createUserUI(
  page: Page,
  opts?: {
    name?: string;
    allow0?: string;
    allow1?: string;
    deny0?: string;
    deny1?: string;
  },
): Promise<string> {
  const name = opts?.name ?? shortUnique("u");
  const fields: [string, string][] = [
    ["organization", TEST_ORGANIZATION],
    ["name", name],
    ["password", TEST_ADMIN_PASSWORD],
  ];
  const allow0 = opts?.allow0 ?? `all:${TEST_ORGANIZATION}`;
  fields.push(["accessRule.allow.0", allow0]);
  if (opts?.allow1) fields.push(["accessRule.allow.1", opts.allow1]);
  if (opts?.deny0) fields.push(["accessRule.deny.0", opts.deny0]);
  if (opts?.deny1) fields.push(["accessRule.deny.1", opts.deny1]);
  await createResourceUI(page, "users", name, fields);
  return name;
}

export async function createProjectUI(
  page: Page,
  name?: string,
): Promise<string> {
  const n = name ?? shortUnique("p");
  await createResourceUI(page, "projects", n, [
    ["organization", TEST_ORGANIZATION],
    ["name", n],
    ["sla", "dev"],
    ["tier", "n0.nano"],
  ]);
  return n;
}

export async function createDatabaseUI(
  page: Page,
  projectName: string,
  name?: string,
): Promise<string> {
  const n = name ?? shortUnique("d");
  await createResourceUI(page, "databases", n, [
    ["organization", TEST_ORGANIZATION],
    ["project", projectName],
    ["name", n],
    ["dbaPassword", "passw0rd"],
  ]);
  return n;
}

export async function createBackupUI(
  page: Page,
  projectName: string,
  databaseName: string,
  name?: string,
): Promise<string> {
  const n = name ?? shortUnique("b");
  await createResourceUI(page, "backups", n, [
    ["organization", TEST_ORGANIZATION],
    ["project", projectName],
    ["database", databaseName],
    ["name", n],
  ]);
  return n;
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
