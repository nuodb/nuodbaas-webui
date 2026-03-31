// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/SearchTest.java
import { test } from "../fixtures";
import {
  clickMenu,
  waitRestComplete,
  waitTableElements,
  replaceInputOrTextareaByName,
  retry,
  selectMuiCombo,
} from "../helpers/ui";
import {
  createResourceRest,
  shortUnique,
  TEST_ORGANIZATION,
  TEST_ADMIN_PASSWORD,
} from "../helpers/api";
import { expect } from "@playwright/test";

test.describe("SearchTest", () => {
  test("testSearch – various search patterns return expected row counts", async ({
    restPage: page,
  }) => {
    test.setTimeout(60_000);
    // Create 90 users (indices 10–99) with labels via REST
    const name = shortUnique("u");
    const labelName = "l" + name.substring(1);

    for (let i = 10; i <= 99; i++) {
      await createResourceRest("users", `/${TEST_ORGANIZATION}/${name}${i}`, {
        organization: TEST_ORGANIZATION,
        name: `${name}${i}`,
        password: TEST_ADMIN_PASSWORD,
        accessRule: { allow: [`all:${TEST_ORGANIZATION}`] },
        labels: {
          label1: "value1",
          label2: `${labelName}${i % 10}`,
        },
      });
    }

    await clickMenu(page, "users");
    await waitRestComplete(page);

    // Verify full page (20) before searching
    await retry(async () => {
      const cells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        null,
        "name",
      );
      expect(cells.length).toBe(20);
    });

    async function search(query: string): Promise<void> {
      await replaceInputOrTextareaByName(page, "search", query);
      await page.locator('input[name="search"]').press("Enter");
      await waitRestComplete(page);
    }

    async function expectCount(
      expected: number,
      description: string,
    ): Promise<void> {
      await retry(async () => {
        const cells = await waitTableElements(
          page,
          "list_resource__table",
          "name",
          null,
          "name",
        );
        expect(cells.length, description).toBe(expected);
      });
    }

    // Users starting with "1" index (10–19 → 10 users)
    await search(`name=${name}1*`);
    await expectCount(10, "name prefix 1*");
    await search(`name~${name}1.*`);
    await expectCount(10, "name prefix 1*");

    // Label existence
    await search("labels.label1");
    await expectCount(20, "label1 existence (full page)");

    // Label value – labelName + "8" appears 9 times (indices 18,28,38,48,58,68,78,88,98)
    await search(`labels.label2=${labelName}8`);
    await expectCount(9, "label2=labelName8");

    // Combined: label + name prefix
    await search(`labels.label2=${labelName}8,name~${name}1.*`);
    await expectCount(1, "label2=labelName8 AND name prefix 1*");

    // All users by name wildcard (first page = 20)
    await search(`name=${name}*`);
    await expectCount(20, "name=name* (full page)");
    await search(`name~${name}.*`);
    await expectCount(20, "name=name* (full page)");

    // Partial name (starting with 1 → 10)
    await search(`name=${name}1*`);
    await expectCount(10, "name=name1*");
    await search(`name~${name}1.*`);
    await expectCount(10, "name=name1*");

    // Suffix wildcard
    await search(`name=*${name.substring(1)}1*`);
    await expectCount(10, "name=*suffix1*");
    await search(`name~.*${name.substring(1)}1.*`);
    await expectCount(10, "name=*suffix1*");

    // Specific suffix
    await search(`name=*${name.substring(2)}18`);
    await expectCount(1, "name=*suffix18");
    await search(`name~.*${name.substring(2)}18`);
    await expectCount(1, "name=*suffix18");

    // Full name match
    await search(`name=${name}19`);
    await expectCount(1, "name=exact name19");

    // Full name match (case insensitive)
    await search("name=" + name.toUpperCase() + "19");
    await expectCount(1, "name=exact name19 uppercase");

    // Invalid name
    await search(`name=${name}invalid`);
    await expectCount(0, "name=invalid");
  });

  /**
   * Verify that the ListResourceFilter dialog works:
   *   1. Open the dialog via the filter‑icon.
   *   2. Add a simple “labels.label1 exists” filter.
   *   3. Confirm the row count matches the expectation.
   *   4. Add a second clause (label2 = value) and verify the narrowed result.
   *   5. Remove the second clause and ensure the original count returns.
   */
  test("filter dialog – add, combine and remove clauses", async ({
    restPage: page,
  }) => {
    test.setTimeout(60_000);

    // -----------------------------------------------------------------------
    // 1️⃣  Navigate to the users list (same data set as the original test)
    // -----------------------------------------------------------------------
    await clickMenu(page, "users");
    await waitRestComplete(page);

    // -----------------------------------------------------------------------
    // Helper: count rows currently displayed in the table
    // -----------------------------------------------------------------------
    async function rowCount(): Promise<number> {
      const cells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        null,
        "name",
      );
      return cells.length;
    }

    // -----------------------------------------------------------------------
    // 2️⃣  Open the filter dialog (the little funnel icon)
    // -----------------------------------------------------------------------
    await page.locator('[data-testid="search-filter"]').click();

    // The dialog is rendered immediately – wait for the "new.resource.filter" dropdown to appear and fill in "labels.label1"
    expect(await selectMuiCombo(page, "new.resource.filter", "name")).toBeTruthy();

    // select "Exists" condition
    expect(await selectMuiCombo(page, "condition.name", "NON_NULL"));

    // No value input is needed for an existence check – just click OK.
    await page.locator('button', { hasText: "OK" }).click();

    // Wait for the REST request triggered by the filter to finish.
    await waitRestComplete(page);

    // validate search field has "name"
    expect(page.locator('input[name="search"]')).toHaveValue("name");

    // The filter “name” should return at least one row
    await retry(async () => {
      const count = await rowCount();
      expect(count, "at least one row expected").not.toBe(0);
    });

    // -----------------------------------------------------------------------
    // 4️⃣  Add a second clause: `organization=invalid`
    // -----------------------------------------------------------------------
    // Re‑open the dialog.
    await page.locator('[data-testid="search-filter"]').click();

    // Add the "organization" field.
    expect(await selectMuiCombo(page, "new.resource.filter", "organization")).toBeTruthy();

    // Fill the organization value with "invalid".
    const valueInput = page.locator('[id="value.organization"]');
    await valueInput.fill("invalid");

    // Apply the combined filter.
    await page.locator('button', { hasText: "OK" }).click();
    await waitRestComplete(page);

    // validate search field with updated values
    expect(page.locator('input[name="search"]')).toHaveValue("name,organization=invalid");

    // with the invalid org, there should be 0 rows
    await retry(async () => {
      const count = await rowCount();
      expect(count, "rows after organization=invalid filter").toBe(0);
    });

    // -----------------------------------------------------------------------
    // 5️⃣  Remove the second clause and verify we are back to the original count
    // -----------------------------------------------------------------------
    await page.locator('[data-testid="search-filter"]').click();

    // Delete the organization field
    await page.locator('[data-testid="search.filter.delete.organization"]').click();

    // Confirm the dialog (still open) and click OK to apply the reduced filter.
    await page.locator('button', { hasText: "OK" }).click();
    await waitRestComplete(page);

    // validate search field with updated values
    expect(page.locator('input[name="search"]')).toHaveValue("name");

    // The result should be the same as after step 3 (at least one row).
    await retry(async () => {
      const count = await rowCount();
      expect(count, "rows after removing second clause").not.toBe(0);
    });
  });
});