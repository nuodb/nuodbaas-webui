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
  getInputOrTextareaByName,
} from "../helpers/ui";
import {
  createResourceRest,
  shortUnique,
  TEST_ORGANIZATION,
  TEST_ADMIN_PASSWORD,
  TEST_ADMIN_USER,
} from "../helpers/api";
import { expect, Page } from "@playwright/test";
import { getSchema } from "../../ui/src/utils/schema"
import Auth from "../../ui/src/utils/auth";
import { FilterCondition } from "../../ui/src/components/pages/ListResourceFilter"

type SearchQueryType = {
  items: {
    condition: FilterCondition;
    fieldName: string;
    ignoreCase: boolean|undefined;
    key: string | undefined;
    value: string | undefined;
  }[],
  expect: number;
  message: string;
}
async function setSearchQuery(page: Page, search: SearchQueryType) {
  const select = page.locator('#select-search');

  //clear out all search queries
  await select.focus();
  for(let i=0; i<10; i++) {
    // assuming we have never more than 10 filters
    await page.keyboard.press('Backspace');
  }
  await select.click();

  // fill in text field
  for(let i=0; i<search.items.length; i++) {
    const item = search.items[i];
    await select.fill(item.fieldName);
    if(item.condition === "search") {
      await page.getByText("search(\"" + item.fieldName + "\")", {exact: true}).click();
    }
    else {
      await page.getByText(item.fieldName, { exact: true }).click();
      await selectMuiCombo(page, "condition", item.condition);
      if(item.key !== undefined) {
        await replaceInputOrTextareaByName(page, "key", item.key);
      }
      if(item.ignoreCase !== undefined) {
        await (await getInputOrTextareaByName(page, "ignoreCase")).setChecked(item.ignoreCase);
      }
      if(item.value !== undefined) {
        await replaceInputOrTextareaByName(page, "value", item.value);
      }
      await page.getByTestId("dialog_button_ok").click();
      await waitRestComplete(page);
    }
  }
}

async function create90Users() : Promise<string> {
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
  return name;
}

async function expectCount(page,
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

  test.describe("SearchTest", () => {
  test("testSearch – various search patterns return expected row counts", async ({
    restPage: page,
  }) => {
    test.setTimeout(60_000);
    await Auth.login(TEST_ORGANIZATION + "/" + TEST_ADMIN_USER, TEST_ADMIN_PASSWORD);
    await getSchema();

    const name = await create90Users();

    await clickMenu(page, "users");
    await waitRestComplete(page);

    await expectCount(page, 20, "expecting full page");

    const labelName = "l" + name.substring(1);
    const checks: SearchQueryType[] = [
      {
        items: [{
          condition: "startsWith",
          fieldName: "name",
          ignoreCase: true,
          key: undefined,
          value: name + "1"
        }],
        expect: 10,
        message: "name prefix 1*"
      },
      {
        items: [{
          condition: "startsWith",
          fieldName: "name",
          ignoreCase: false,
          key: undefined,
          value: name
        }],
        expect: 20,
        message: "name=name* (full page)"
      },
      {
        items: [{
          condition: "search",
          fieldName: name + "1",
          ignoreCase: false,
          key: undefined,
          value: name + "1",
        }],
        expect: 10,
        message: "name1*"
      },
      {
        items: [{
          condition: "contains",
          fieldName: "name",
          ignoreCase: false,
          key: undefined,
          value: name.substring(1) + "1"
        }],
        expect: 10,
        message: "name=*suffix1*"
      },
      {
        items: [{
          condition: "endsWith",
          fieldName: "name",
          ignoreCase: false,
          key: undefined,
          value: name.substring(2) + "19"
        }],
        expect: 1,
        message: "name=endsWith name19"
      },
      {
        items: [{
          condition: "=",
          fieldName: "name",
          ignoreCase: false,
          key: undefined,
          value: name + "19",
        }],
        expect: 1,
        message: "name=exact name19"
      },
      {
        items: [{
          condition: "=",
          fieldName: "name",
          ignoreCase: true,
          key: undefined,
          value: name.toUpperCase() + "19"
        }],
        expect: 1,
        message: "name=exact name 19 uppercase"
      },
      {
        items: [{
          condition: "=",
          fieldName: "name",
          ignoreCase: false,
          key: undefined,
          value: name + "invalid"
        }],
        expect: 0,
        message: "name=invalid"
      },
      {
        items: [{
          condition: "exists",
          fieldName: "labels.*",
          ignoreCase: undefined,
          key: "label1",
          value: undefined
        }],
        expect: 20,
        message: "label1 existence (full page)"
      },
      {
        items: [{
          condition: "=",
          fieldName: "labels.*",
          ignoreCase: true,
          key: "label2",
          value: labelName + "8"
        }],
        expect: 9,
        message: "label2=labelName8"
      },
      {
        items: [
          {
            condition: "=",
            fieldName: "labels.*",
            ignoreCase: true,
            key: "label2",
            value: labelName + "8"
          },
          {
            condition: "~",
            fieldName: "name",
            ignoreCase: undefined,
            key: undefined,
            value: name + "1.*"
          }
        ],
        expect: 1,
        message: "label2=labelName8 AND name prefix 1*"
      }
    ];

    for(let c=0; c<checks.length; c++) {
      const check = checks[c];
      console.log("[" + String(c+1) + "/" + String(checks.length) + "] Running check for " + check.message);
      await setSearchQuery(page, check);
    }
  });
});