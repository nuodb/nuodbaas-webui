// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import { test } from "@playwright/test";
const fs = require("fs");

test.describe("global setup", () => {
  test("setup coverage", async ({ page }) => {
    fs.rmSync("target/coverage-data", { recursive: true, force: true });
    fs.rmSync("target/coverage-reports", { recursive: true, force: true });
  });
});
