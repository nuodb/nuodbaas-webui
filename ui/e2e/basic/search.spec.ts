// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/SearchTest.java
import { test, expect } from "../fixtures";
import {
  clickMenu,
  waitRestComplete,
  waitTableElements,
  replaceInputOrTextareaByName,
  retry,
  sleep,
} from "../helpers/ui";
import {
  createResourceRest,
  shortUnique,
  TEST_ORGANIZATION,
  TEST_ADMIN_PASSWORD,
} from "../helpers/api";

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
    await search(`${name}1*`);
    await expectCount(10, "name prefix 1*");

    // Label existence
    await search("labels=label1");
    await expectCount(20, "label1 existence (full page)");

    // Label value – labelName + "8" appears 9 times (indices 18,28,38,48,58,68,78,88,98)
    await search(`labels=label2=${labelName}8`);
    await expectCount(9, "label2=labelName8");

    // Combined: label + name prefix
    await search(`labels=label2=${labelName}8 name=${name}1*`);
    await expectCount(1, "label2=labelName8 AND name prefix 1*");

    // All users by name wildcard (first page = 20)
    await search(`name=${name}*`);
    await expectCount(20, "name=name* (full page)");

    // Partial name (starting with 1 → 10)
    await search(`name=${name}1*`);
    await expectCount(10, "name=name1*");

    // Suffix wildcard
    await search(`name=*${name.substring(1)}1*`);
    await expectCount(10, "name=*suffix1*");

    // Specific suffix
    await search(`name=*${name.substring(2)}18`);
    await expectCount(1, "name=*suffix18");

    // Full name match
    await search(`name=${name}19`);
    await expectCount(1, "name=exact name19");

    // Invalid name
    await search(`name=${name}invalid`);
    await expectCount(0, "name=invalid");
  });
});
