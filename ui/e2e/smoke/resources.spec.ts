// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/smoke/ResourcesTest.java
import { test } from "../fixtures";
import {
  createUserUI,
  createProjectUI,
  createDatabaseUI,
  createBackupUI,
  deleteResourceUI,
  sleep,
} from "../helpers/ui";

test.describe("ResourcesTest (smoke)", () => {
  test("testCreateDeleteResources – full create-then-delete lifecycle", async ({
    restPage: page,
  }) => {
    // Create in dependency order
    const user = await createUserUI(page);
    const project = await createProjectUI(page);
    const db = await createDatabaseUI(page, project);
    const backup = await createBackupUI(page, project, db);

    sleep(1000);

    // Delete in reverse dependency order
    await deleteResourceUI(page, "backups", backup);
    await deleteResourceUI(page, "databases", db);
    await deleteResourceUI(page, "projects", project);
    await deleteResourceUI(page, "users", user);
  });
});
