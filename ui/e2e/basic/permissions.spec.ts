// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/PermissionsTest.java
import { test, expect } from "../fixtures";
import {
  clickMenu,
  clickPopupMenu,
  clickUserMenu,
  waitRestComplete,
  waitTableElements,
  hasElement,
  hasNotElement,
  hasMenu,
  hasNotMenu,
  hasPopupMenu,
  hasNotPopupMenu,
  createUserUI,
  createProjectUI,
  sleep,
} from "../helpers/ui";
import {
  loginRest,
  loginViaUI,
  TEST_ORGANIZATION,
  TEST_ADMIN_USER,
  TEST_ADMIN_PASSWORD,
} from "../fixtures";
import {
  createUserRest,
  createResourceRest,
  shortUnique,
  TEST_ADMIN_PASSWORD as ADMIN_PWD,
} from "../helpers/api";
import { type Page } from "@playwright/test";

/** Creates a limited user via UI then logs in as that user. */
async function createAndLoginUser(
  page: Page,
  allow0?: string,
  allow1?: string,
  deny0?: string,
  deny1?: string,
): Promise<string> {
  await loginRest(page);
  const user = await createUserUI(page, { allow0, allow1, deny0, deny1 });
  await clickUserMenu(page, "logout");
  await loginViaUI(page, TEST_ORGANIZATION, user, TEST_ADMIN_PASSWORD);
  return user;
}

test.describe("PermissionsTest", () => {
  test("testReadEverything – read-only user sees all menus but no create/edit", async ({
    restPage: page,
  }) => {
    await loginRest(page);
    const project = await createProjectUI(page);
    await clickUserMenu(page, "logout");
    await createAndLoginUser(page, `read:${TEST_ORGANIZATION}`);

    // All menus visible
    for (const m of [
      "projects",
      "databases",
      "backups",
      "backuppolicies",
      "users",
    ]) {
      await hasMenu(page, m);
    }

    // No create buttons on users and projects
    await clickMenu(page, "users");
    await hasNotElement(page, "list_resource__create_button_users", 1_000);
    await clickMenu(page, "projects");
    await hasNotElement(page, "list_resource__create_button_projects", 1_000);

    // In the projects list: no Edit popup, View popup present
    const menuCells = await waitTableElements(
      page,
      "list_resource__table",
      "name",
      project,
      "$ref",
    );
    expect(menuCells.length).toBe(1);
    await hasNotPopupMenu(page, menuCells[0], "edit_button");
    await clickPopupMenu(page, menuCells[0], "view_button");

    // In the view popup: show.databases present, edit absent
    await sleep(100); // TODO(agr22)
    const popupMenu = page.locator("[data-testid=resource-popup-menu]");
    popupMenu.first().waitFor({state: "visible"});
    popupMenu.first().click();
    await hasElement(page, "popupmenu-button.show.databases");
    await hasNotElement(page, "popupmenu-edit_button", 1_000);
  });

  test("testReadProjectsUsers – user with limited read access sees only those menus", async ({
    restPage: page,
  }) => {
    await createAndLoginUser(
      page,
      `read:/projects/${TEST_ORGANIZATION}/*`,
      `read:/users/${TEST_ORGANIZATION}/*`,
    );

    await hasMenu(page, "projects");
    await hasMenu(page, "users");
    await hasNotMenu(page, "databases", 500);
    await hasNotMenu(page, "backups", 500);
    await hasNotMenu(page, "backupPolicies", 500);
  });

  test("testReadEverythingWriteUsers – can create users but not projects", async ({
    restPage: page,
  }) => {
    await createAndLoginUser(
      page,
      `read:${TEST_ORGANIZATION}`,
      `write:/users/${TEST_ORGANIZATION}`,
    );

    await clickMenu(page, "projects");
    await hasNotElement(page, "list_resource__create_button_projects", 1_000);

    await clickMenu(page, "users");
    await hasElement(page, "list_resource__create_button_users");
  });

  test("testWriteEverythingExceptUsers – all:org with deny users write", async ({
    restPage: page,
  }) => {
    await createAndLoginUser(
      page,
      `all:${TEST_ORGANIZATION}`,
      undefined,
      `write:/users/${TEST_ORGANIZATION}`,
    );

    await clickMenu(page, "projects");
    await hasElement(page, "list_resource__create_button_projects");

    await clickMenu(page, "users");
    await hasNotElement(page, "list_resource__create_button_users", 1_000);
  });

  test("testUserWithRoleOrgAdmin – organization-admin role grants extra cluster access", async ({
    restPage: page,
  }) => {
    await loginRest(page);
    const user = shortUnique("u");
    await createResourceRest("users", `/${TEST_ORGANIZATION}/${user}`, {
      organization: TEST_ORGANIZATION,
      name: user,
      password: ADMIN_PWD,
      accessRule: { allow: [`read:${TEST_ORGANIZATION}`] },
      roles: [
        {
          name: "organization-admin",
          params: { organization: TEST_ORGANIZATION },
        },
      ],
    });
    await clickUserMenu(page, "logout");
    await loginViaUI(page, TEST_ORGANIZATION, user, ADMIN_PWD);

    // Can write projects
    await clickMenu(page, "projects");
    await hasElement(page, "list_resource__create_button_projects");

    // Can read service tiers and helmfeatures
    await clickMenu(page, "cluster/servicetiers");
    await clickMenu(page, "cluster/helmfeatures");

    // Cannot read canaryrollouts
    await hasNotMenu(page, "cluster/canaryrollouts", 1_000);
  });
});
