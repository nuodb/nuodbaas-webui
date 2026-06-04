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
    console.log("STEP1");
    const user = await createUserUI(page);
    console.log("STEP2");
    await sleep(100);
    const project = await createProjectUI(page);
    console.log("STEP3");
    await sleep(100);
    const db = await createDatabaseUI(page, project);
    console.log("STEP4");
    await sleep(100);
    const backup = await createBackupUI(page, project, db);
    console.log("STEP5");

    await sleep(1000); // TODO(agr22)

    // Delete in reverse dependency order
    console.log("STEP6");
    await deleteResourceUI(page, "backups", backup);
    console.log("STEP7");
    await sleep(100);
    await deleteResourceUI(page, "databases", db);
    console.log("STEP8");
    await sleep(100);
    await deleteResourceUI(page, "projects", project);
    console.log("STEP9");
    await sleep(100);
    await deleteResourceUI(page, "users", user);
    console.log("STEP10");
    await sleep(100);
  });
});
