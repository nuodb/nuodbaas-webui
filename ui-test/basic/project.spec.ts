// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/ProjectTest.java
import { test } from "../fixtures";
import {
  clickMenu,
  clickPopupMenu,
  waitRestComplete,
  waitTableElements,
  replaceInputOrTextareaByName,
  retry,
  createProjectUI,
} from "../helpers/ui";
import { createProjectRest, TEST_ORGANIZATION } from "../helpers/api";
import { expect } from "@playwright/test";

test.describe("ProjectTest", () => {
  test("testCreateProject", async ({ restPage: page }) => {
    await createProjectUI(page);
  });

  test("testListCreateAndDeleteProjects", async ({ restPage: page }) => {
    const projectName = await createProjectUI(page);
    await clickMenu(page, "projects");

    // Delete via popup menu
    await retry(async () => {
      const menuCells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        projectName,
        "$ref",
      );
      expect(menuCells.length).toBe(1);
      await clickPopupMenu(page, menuCells[0], "delete_button");
      await page.getByTestId("dialog_button_yes").click();
    });

    await waitRestComplete(page);
    // Verify gone (retry up to 30 s to handle CP propagation)
    await retry(
      async () => {
        const cells = await waitTableElements(
          page,
          "list_resource__table",
          "name",
          projectName,
          "$ref",
        );
        expect(cells.length).toBe(0);
      },
      30,
      1_000,
    );
  });

  test("testEditProject – change tier and maintenance.expiresIn", async ({
    restPage: page,
  }) => {
    const projectName = await createProjectRest();
    // Resource versions are updated by CP/operator in the background; retry on conflicts
    await retry(
      async () => {
        await clickMenu(page, "projects");
        const menuCells = await waitTableElements(
          page,
          "list_resource__table",
          "name",
          projectName,
          "$ref",
        );
        expect(menuCells.length).toBe(1);
        await clickPopupMenu(page, menuCells[0], "edit_button");

        await replaceInputOrTextareaByName(page, "tier", "n0.small");
        await page.getByTestId("section-title-advanced").click();
        await page.getByTestId("section-maintenance").click();
        await replaceInputOrTextareaByName(
          page,
          "maintenance.expiresIn",
          "30d",
        );
        await page.getByTestId("create_resource__save_button").click();
        await waitRestComplete(page);

        const tierCells = await waitTableElements(
          page,
          "list_resource__table",
          "name",
          projectName,
          "tier",
        );
        expect(tierCells.length).toBe(1);
        const text = await tierCells[0].textContent();
        expect(text).toContain("n0.small");
      },
      10,
      1_000,
    );
  });
});
